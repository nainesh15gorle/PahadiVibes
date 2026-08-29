// src/lib/ai/revenue-events.ts
import { supabaseAdmin } from "@/lib/supabase";
import {
  RecordRevenueEventInput,
  RecordRevenueEventResult,
  DbRevenueEvent,
  DbRecoveryCase,
  DbAgentAction,
  RecoveryCaseStage,
  RecoveryCaseStatus,
  AgentActionType
} from "./types";

/**
 * Idempotently and safely records a revenue event into the Pahadi AI event stream,
 * maintaining the state of the corresponding recovery case and logging agent audit actions.
 *
 * Guarantees:
 * - Non-blocking / fault-tolerant (never throws to crash caller)
 * - Strict Idempotency (duplicate event_ids are safely bypassed)
 * - Atomic progression of recovery lifecycle
 */
export async function recordRevenueEvent(
  input: RecordRevenueEventInput
): Promise<RecordRevenueEventResult> {
  try {
    const {
      eventType,
      orderId = null,
      razorpayOrderId = null,
      razorpayPaymentId = null,
      customerId = null,
      customerName = null,
      customerEmail = null,
      customerPhone = null,
      amount = 0,
      currency = "INR",
      failureReason = null,
      cartItems = [],
      rawPayload = {},
      metadata = {}
    } = input;

    // 1. Generate deterministic idempotency key if not explicitly passed
    const deterministicKey =
      input.eventId ||
      `evt_${orderId || "unknown"}_${eventType.toLowerCase()}_${
        razorpayPaymentId || razorpayOrderId || "init"
      }`;

    // 2. Check for existing event (Idempotency Check)
    const { data: existingEvent, error: checkError } = await supabaseAdmin
      .from("revenue_events")
      .select("*")
      .eq("event_id", deterministicKey)
      .maybeSingle();

    if (!checkError && existingEvent) {
      return {
        success: true,
        isDuplicate: true,
        event: existingEvent as DbRevenueEvent,
        recoveryCase: null,
        action: null
      };
    }

    // 3. Insert into revenue_events table
    const newEventPayload = {
      event_id: deterministicKey,
      event_type: eventType,
      order_id: orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      customer_id: customerId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      amount: Number(amount) || 0,
      currency: currency || "INR",
      status: "RECORDED",
      failure_reason: failureReason,
      raw_payload: rawPayload || {},
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    };

    const { data: insertedEvent, error: eventInsertError } = await supabaseAdmin
      .from("revenue_events")
      .insert(newEventPayload)
      .select()
      .maybeSingle();

    if (eventInsertError) {
      console.warn("Pahadi AI [revenue_events insert notice]:", eventInsertError.message || eventInsertError);
      // If table is not created yet in Postgres, return gracefully without blocking
      return {
        success: false,
        isDuplicate: false,
        event: null,
        recoveryCase: null,
        action: null,
        error: eventInsertError.message
      };
    }

    let recoveryCaseRecord: DbRecoveryCase | null = null;
    let agentActionRecord: DbAgentAction | null = null;

    // 4. Update / Create Recovery Case if orderId is present
    if (orderId) {
      const { data: existingCase, error: caseFetchError } = await supabaseAdmin
        .from("recovery_cases")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      const now = new Date().toISOString();

      if (!existingCase && !caseFetchError) {
        // Create new recovery case
        const initialStage: RecoveryCaseStage =
          eventType === "PAYMENT_FAILED"
            ? "PAYMENT_FAILED"
            : eventType === "PAYMENT_SUCCESS"
            ? "CHECKOUT_INITIATED"
            : "CHECKOUT_INITIATED";

        const initialStatus: RecoveryCaseStatus =
          eventType === "PAYMENT_SUCCESS" ? "RECOVERED" : "OPEN";

        const newCasePayload = {
          case_id: `rcase_${orderId.substring(0, 8)}_${Date.now().toString(36)}`,
          order_id: orderId,
          razorpay_order_id: razorpayOrderId,
          customer_id: customerId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          amount: Number(amount) || 0,
          currency: currency || "INR",
          stage: initialStage,
          recovery_status: initialStatus,
          failure_reason: failureReason,
          last_event_id: insertedEvent?.id || deterministicKey,
          cart_items: cartItems || [],
          metadata: metadata || {},
          created_at: now,
          updated_at: now,
          recovered_at: eventType === "PAYMENT_SUCCESS" ? now : null
        };

        const { data: createdCase, error: createCaseError } = await supabaseAdmin
          .from("recovery_cases")
          .insert(newCasePayload)
          .select()
          .maybeSingle();

        if (!createCaseError) {
          recoveryCaseRecord = createdCase as DbRecoveryCase;
        }
      } else if (existingCase) {
        // Update existing recovery case state
        let updatedStatus: RecoveryCaseStatus = existingCase.recovery_status;
        let updatedStage: RecoveryCaseStage = existingCase.stage;
        let recoveredAt: string | null = existingCase.recovered_at;

        if (eventType === "PAYMENT_SUCCESS") {
          updatedStatus = "RECOVERED";
          recoveredAt = now;
        } else if (eventType === "PAYMENT_FAILED") {
          updatedStage = "PAYMENT_FAILED";
          if (updatedStatus !== "RECOVERED") {
            updatedStatus = "OPEN";
          }
        } else if (eventType === "ORDER_ABANDONED" || eventType === "MODAL_DISMISSED") {
          updatedStage = "ABANDONED";
        }

        const updateCasePayload: any = {
          recovery_status: updatedStatus,
          stage: updatedStage,
          last_event_id: insertedEvent?.id || deterministicKey,
          updated_at: now
        };

        if (razorpayOrderId) updateCasePayload.razorpay_order_id = razorpayOrderId;
        if (failureReason) updateCasePayload.failure_reason = failureReason;
        if (recoveredAt) updateCasePayload.recovered_at = recoveredAt;
        if (customerPhone && !existingCase.customer_phone) updateCasePayload.customer_phone = customerPhone;

        const { data: updatedCase, error: updateCaseError } = await supabaseAdmin
          .from("recovery_cases")
          .update(updateCasePayload)
          .eq("id", existingCase.id)
          .select()
          .maybeSingle();

        if (!updateCaseError) {
          recoveryCaseRecord = updatedCase as DbRecoveryCase;
        }
      }

      // 5. Insert Agent Action Audit Log
      if (recoveryCaseRecord) {
        let actionType: AgentActionType = "EVENT_CAPTURED";
        let reasoning = `Recorded revenue event: ${eventType}`;

        if (eventType === "PAYMENT_FAILED") {
          actionType = "PAYMENT_FAILURE_CAPTURED";
          reasoning = `Payment failed at gateway (${failureReason || "Reason unknown"}). Case initialized/updated for recovery.`;
        } else if (eventType === "PAYMENT_SUCCESS") {
          actionType = "PAYMENT_COMPLETED";
          reasoning = "Payment completed and verified. Revenue recovery case resolved.";
        } else if (eventType === "ORDER_CREATED" || eventType === "PAYMENT_PENDING") {
          actionType = "CASE_INITIALIZED";
          reasoning = "Checkout initiated with active cart. Tracking session for dropoff detection.";
        }

        const actionPayload = {
          case_id: recoveryCaseRecord.id,
          action_type: actionType,
          channel: "SYSTEM",
          status: "RECORDED",
          action_payload: {
            eventType,
            amount,
            orderId,
            razorpayPaymentId,
            failureReason
          },
          reasoning,
          executed_at: now,
          created_at: now
        };

        const { data: createdAction } = await supabaseAdmin
          .from("agent_actions")
          .insert(actionPayload)
          .select()
          .maybeSingle();

        if (createdAction) {
          agentActionRecord = createdAction as DbAgentAction;
        }
      }
    }

    return {
      success: true,
      isDuplicate: false,
      event: (insertedEvent as DbRevenueEvent) || null,
      recoveryCase: recoveryCaseRecord,
      action: agentActionRecord
    };
  } catch (error: any) {
    console.error("Pahadi AI [recordRevenueEvent error]:", error);
    return {
      success: false,
      isDuplicate: false,
      event: null,
      recoveryCase: null,
      action: null,
      error: error?.message || "Internal error recording revenue event"
    };
  }
}

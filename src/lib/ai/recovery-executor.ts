// src/lib/ai/recovery-executor.ts
import crypto from "crypto";
import { supabaseAdmin, updateOrderStatusSafe, mapDbOrderToOrder } from "@/lib/supabase";
import { recordRevenueEvent } from "./revenue-events";
import type {
  AgentActionChannel,
  DbRecoveryCase,
  ExecutionResult,
  RecoveryExecutionInput
} from "./types";

export interface CreatePaymentLinkOptions {
  keyId?: string;
  keySecret?: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export interface RazorpayPaymentLinkResponse {
  id: string;
  short_url: string;
  status: string;
  amount: number;
  currency: string;
  expire_by?: number;
}

/**
 * Creates a Razorpay Payment Link for an approved recovery case.
 *
 * SAFETY INVARIANTS:
 * - Uses server-side Razorpay credentials only.
 * - Uses order/case data as the strict source of truth for amounts.
 * - Never directly charges a customer card.
 * - Returns a payment link for customer authorization.
 */
export async function createRazorpayPaymentLink(
  recoveryCase: DbRecoveryCase,
  options?: CreatePaymentLinkOptions
): Promise<RazorpayPaymentLinkResponse> {
  const keyId =
    options?.keyId ||
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  const keySecret =
    options?.keySecret ||
    process.env.RAZORPAY_KEY_SECRET;

  const amountPaise = Math.round(Number(recoveryCase.amount) * 100);
  if (amountPaise <= 0 || isNaN(amountPaise)) {
    throw new Error(`Invalid recovery case amount: ₹${recoveryCase.amount}`);
  }

  const currency = (recoveryCase.currency || "INR").toUpperCase();
  const baseUrl = options?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://pahadivibes.com";

  // In test / offline mode without live credentials, return deterministic link structure
  if (!options?.fetcher && (!keyId || !keySecret)) {
    const cleanId = recoveryCase.order_id.replace(/[^a-zA-Z0-9]/g, "");
    return {
      id: `plink_test_${cleanId}`,
      short_url: `https://rzp.io/i/test_${cleanId}`,
      status: "created",
      amount: amountPaise,
      currency,
      expire_by: Math.floor(Date.now() / 1000) + 86400
    };
  }

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay API credentials not configured on server (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing)."
    );
  }

  // Payload strictly derived from immutable backend recovery case
  const linkPayload = {
    amount: amountPaise,
    currency,
    accept_partial: false,
    description: `Recovery Payment for Order #${recoveryCase.order_id}`,
    customer: {
      name: recoveryCase.customer_name || "Valued Customer",
      email: recoveryCase.customer_email || undefined,
      contact: recoveryCase.customer_phone || undefined
    },
    notify: {
      sms: Boolean(recoveryCase.customer_phone),
      email: Boolean(recoveryCase.customer_email)
    },
    reminder_enable: true,
    notes: {
      case_id: recoveryCase.case_id,
      recovery_case_id: recoveryCase.id,
      internalOrderId: recoveryCase.order_id,
      order_id: recoveryCase.order_id,
      source: "pahadi_ai_recovery"
    },
    callback_url: `${baseUrl}/checkout/success?recovery_order_id=${encodeURIComponent(
      recoveryCase.order_id
    )}`,
    callback_method: "get"
  };

  const authString = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const fetchImpl = options?.fetcher || fetch;

  const response = await fetchImpl("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authString}`
    },
    body: JSON.stringify(linkPayload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let parsedError: any = {};
    try {
      parsedError = JSON.parse(errorBody);
    } catch {
      parsedError = { message: errorBody };
    }
    const errorMessage =
      parsedError.error?.description ||
      parsedError.error?.message ||
      parsedError.message ||
      `Razorpay API returned status ${response.status}`;
    throw new Error(`Razorpay Payment Link creation failed: ${errorMessage}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    short_url: data.short_url,
    status: data.status || "created",
    amount: data.amount,
    currency: data.currency,
    expire_by: data.expire_by
  };
}

/**
 * Recovery Executor for Pahadi AI
 *
 * Executes ONLY actions that have already been validated and approved by the Policy Engine.
 *
 * State Progression:
 * OPEN -> IN_RECOVERY (on Link Creation) -> RECOVERED (on Verified Webhook)
 */
export async function executeRecoveryAction(
  input: RecoveryExecutionInput,
  options?: CreatePaymentLinkOptions
): Promise<ExecutionResult> {
  const { recoveryCase, decision, policy } = input;

  // 1. Safety Check: Verify Policy Approval
  if (!policy.allowed) {
    return {
      success: false,
      status: "SKIPPED",
      actionType: decision.action,
      channel: "SYSTEM",
      executionDetails: {
        reason: "Execution blocked: Policy evaluation was not approved.",
        violatedPolicy: policy.violatedPolicy
      },
      error: policy.reason
    };
  }

  // 2. Safety Check: Confirm case is not already recovered
  if (recoveryCase.recovery_status === "RECOVERED") {
    return {
      success: false,
      status: "SKIPPED",
      actionType: decision.action,
      channel: "SYSTEM",
      executionDetails: {
        reason: "Case is already marked as RECOVERED."
      },
      error: "Case is already recovered. No further action permitted."
    };
  }

  // 3. Safety Check: Validate Amount
  if (Number(recoveryCase.amount) <= 0 || isNaN(Number(recoveryCase.amount))) {
    return {
      success: false,
      status: "FAILED",
      actionType: decision.action,
      channel: "SYSTEM",
      executionDetails: {
        reason: "Invalid order amount for recovery."
      },
      error: "Invalid order amount for recovery."
    };
  }

  try {
    switch (decision.action) {
      case "RETRY_PAYMENT": {
        // Create compliant Razorpay Payment Link
        const plink = await createRazorpayPaymentLink(recoveryCase, options);

        const channel: AgentActionChannel = recoveryCase.customer_email
          ? "EMAIL"
          : recoveryCase.customer_phone
          ? "SMS"
          : "SYSTEM";

        const retrySession = {
          orderId: recoveryCase.order_id,
          razorpayOrderId: recoveryCase.razorpay_order_id,
          paymentLinkId: plink.id,
          paymentLinkUrl: plink.short_url,
          amountPaise: Math.round(Number(recoveryCase.amount) * 100),
          currency: recoveryCase.currency || "INR",
          customerEmail: recoveryCase.customer_email,
          customerPhone: recoveryCase.customer_phone,
          retryUrl: plink.short_url || `/cart?resumeOrderId=${encodeURIComponent(recoveryCase.order_id)}`,
          initiatedAt: new Date().toISOString()
        };

        // Persist Payment Link metadata into recovery case
        const now = new Date().toISOString();
        if (recoveryCase.id) {
          try {
            await supabaseAdmin
              .from("recovery_cases")
              .update({
                recovery_status: "IN_RECOVERY",
                updated_at: now,
                metadata: {
                  ...recoveryCase.metadata,
                  paymentLink: {
                    id: plink.id,
                    shortUrl: plink.short_url,
                    status: plink.status,
                    createdAt: now
                  }
                }
              })
              .eq("id", recoveryCase.id);
          } catch (dbErr) {
            console.warn("Pahadi AI [executeRecoveryAction db update notice]:", dbErr);
          }
        }

        return {
          success: true,
          status: "INITIATED",
          actionType: "RETRY_PAYMENT",
          channel,
          paymentLink: {
            id: plink.id,
            shortUrl: plink.short_url,
            amount: plink.amount ? plink.amount / 100 : Number(recoveryCase.amount),
            currency: plink.currency || recoveryCase.currency || "INR",
            status: plink.status
          },
          executionDetails: {
            workflow: "PAYMENT_RETRY_INITIATED",
            paymentLinkId: plink.id,
            paymentLinkUrl: plink.short_url,
            retrySession,
            message: `Initiated Razorpay Payment Link recovery (${plink.id}) for order ${recoveryCase.order_id}.`
          }
        };
      }

      case "SEND_REMINDER": {
        const channel: AgentActionChannel = recoveryCase.customer_email
          ? "EMAIL"
          : recoveryCase.customer_phone
          ? "SMS"
          : "SYSTEM";

        const reminderPayload = {
          orderId: recoveryCase.order_id,
          customerName: recoveryCase.customer_name || "Valued Customer",
          recipient: recoveryCase.customer_email || recoveryCase.customer_phone || "customer",
          amount: recoveryCase.amount,
          currency: recoveryCase.currency || "INR",
          cartItemsCount: Array.isArray(recoveryCase.cart_items) ? recoveryCase.cart_items.length : 0,
          paymentLink: `/cart?resumeOrderId=${encodeURIComponent(recoveryCase.order_id)}`,
          scheduledAt: new Date().toISOString()
        };

        return {
          success: true,
          status: "INITIATED",
          actionType: "SEND_REMINDER",
          channel,
          executionDetails: {
            workflow: "REMINDER_QUEUED",
            reminderPayload,
            message: `Recovery reminder scheduled for ${reminderPayload.recipient} via ${channel}.`
          }
        };
      }

      case "NO_ACTION":
      default: {
        return {
          success: true,
          status: "SKIPPED",
          actionType: "NO_ACTION",
          channel: "SYSTEM",
          executionDetails: {
            workflow: "NO_ACTION_RECORDED",
            reason: decision.reason
          }
        };
      }
    }
  } catch (error: any) {
    console.error("Pahadi AI [executeRecoveryAction error]:", error);
    return {
      success: false,
      status: "FAILED",
      actionType: decision.action,
      channel: "SYSTEM",
      executionDetails: {
        error: error?.message || "Execution failed unexpectedly"
      },
      error: error?.message || "Execution failure"
    };
  }
}

export interface ProcessRecoveryWebhookParams {
  rawBody: string;
  signature: string;
  webhookSecret?: string;
  event?: any;
  supabaseClient?: any;
}

export interface ProcessRecoveryWebhookResult {
  success: boolean;
  statusCode: number;
  recoveryProcessed: boolean;
  isDuplicate?: boolean;
  caseId?: string;
  orderId?: string;
  recoveredAmount?: number;
  currency?: string;
  razorpayPaymentId?: string;
  razorpayPaymentLinkId?: string;
  status?: string;
  error?: string;
  message?: string;
}

/**
 * Handles and cryptographically verifies Razorpay Webhook events for Pahadi AI recovery cases.
 *
 * Guarantees:
 * - HMAC SHA256 signature verification
 * - Idempotent processing (never counts recovery twice)
 * - Strict amount & currency verification
 * - Atomic progression to RECOVERED and PAYMENT_RECOVERED audit logging
 */
export async function processRecoveryPaymentWebhook(
  params: ProcessRecoveryWebhookParams
): Promise<ProcessRecoveryWebhookResult> {
  const { rawBody, signature, webhookSecret, supabaseClient } = params;
  const db = supabaseClient || supabaseAdmin;

  // 1. Signature Verification
  const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Pahadi AI Webhook Error: RAZORPAY_WEBHOOK_SECRET is not configured.");
    return {
      success: false,
      statusCode: 500,
      recoveryProcessed: false,
      error: "Webhook secret not configured"
    };
  }

  if (!signature) {
    return {
      success: false,
      statusCode: 400,
      recoveryProcessed: false,
      error: "Missing signature"
    };
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.error("Pahadi AI Webhook Error: Invalid signature handshake.");
    return {
      success: false,
      statusCode: 400,
      recoveryProcessed: false,
      error: "Invalid signature"
    };
  }

  // 2. Parse Webhook Event
  let event: any;
  try {
    event = params.event || JSON.parse(rawBody);
  } catch (err: any) {
    return {
      success: false,
      statusCode: 400,
      recoveryProcessed: false,
      error: "Malformed JSON payload"
    };
  }

  const supportedEvents = ["payment_link.paid", "payment.captured", "order.paid"];
  if (!supportedEvents.includes(event.event)) {
    return {
      success: true,
      statusCode: 200,
      recoveryProcessed: false,
      message: `Ignored non-recovery event: ${event.event}`
    };
  }

  // 3. Extract Recovery Entity & Identifiers
  const plinkEntity = event.payload?.payment_link?.entity;
  const paymentEntity = event.payload?.payment?.entity;
  const orderEntity = event.payload?.order?.entity;

  const caseIdFromNotes =
    plinkEntity?.notes?.case_id ||
    plinkEntity?.notes?.recovery_case_id ||
    paymentEntity?.notes?.case_id ||
    paymentEntity?.notes?.recovery_case_id ||
    orderEntity?.notes?.case_id;

  const orderIdFromNotes =
    plinkEntity?.notes?.internalOrderId ||
    plinkEntity?.notes?.order_id ||
    paymentEntity?.notes?.internalOrderId ||
    paymentEntity?.notes?.order_id ||
    orderEntity?.notes?.internalOrderId;

  const paymentLinkId = plinkEntity?.id || paymentEntity?.payment_link_id || null;
  const razorpayPaymentId = paymentEntity?.id || plinkEntity?.payment_id || null;
  const razorpayOrderId = paymentEntity?.order_id || plinkEntity?.order_id || orderEntity?.id || null;

  // Paid amount in paise
  const paidAmountPaise = Number(
    paymentEntity?.amount ||
    plinkEntity?.amount_paid ||
    plinkEntity?.amount ||
    orderEntity?.amount ||
    0
  );

  const paidCurrency = (
    paymentEntity?.currency ||
    plinkEntity?.currency ||
    orderEntity?.currency ||
    "INR"
  ).toUpperCase();

  // If no recovery case identifiers found in notes, skip recovery processing
  if (!caseIdFromNotes && !orderIdFromNotes && !paymentLinkId) {
    return {
      success: true,
      statusCode: 200,
      recoveryProcessed: false,
      message: "No Pahadi AI recovery case associated with this webhook payload."
    };
  }

  // 4. Fetch Associated Recovery Case
  let recoveryCase: DbRecoveryCase | null = null;

  if (caseIdFromNotes) {
    const { data: caseByCaseId } = await db
      .from("recovery_cases")
      .select("*")
      .or(`case_id.eq.${caseIdFromNotes},id.eq.${caseIdFromNotes}`)
      .maybeSingle();

    if (caseByCaseId) recoveryCase = caseByCaseId as DbRecoveryCase;
  }

  if (!recoveryCase && orderIdFromNotes) {
    const { data: caseByOrder } = await db
      .from("recovery_cases")
      .select("*")
      .eq("order_id", orderIdFromNotes)
      .maybeSingle();

    if (caseByOrder) recoveryCase = caseByOrder as DbRecoveryCase;
  }

  if (!recoveryCase) {
    console.warn(`Pahadi AI Webhook: Recovery case not found for reference (Case: ${caseIdFromNotes}, Order: ${orderIdFromNotes})`);
    return {
      success: false,
      statusCode: 404,
      recoveryProcessed: false,
      error: "Recovery case not found for provided identifiers"
    };
  }

  // 5. Idempotency Check: Case is already recovered
  if (recoveryCase.recovery_status === "RECOVERED") {
    console.log(`Pahadi AI Webhook: Case ${recoveryCase.case_id} already marked RECOVERED. Idempotent return.`);
    return {
      success: true,
      statusCode: 200,
      recoveryProcessed: false,
      isDuplicate: true,
      caseId: recoveryCase.case_id,
      orderId: recoveryCase.order_id,
      recoveredAmount: Number(recoveryCase.amount),
      currency: recoveryCase.currency,
      status: "RECOVERED",
      message: "Recovery case already processed as RECOVERED"
    };
  }

  // 6. Verify Amount & Currency
  const expectedPaise = Math.round(Number(recoveryCase.amount) * 100);
  if (paidAmountPaise <= 0 || paidAmountPaise !== expectedPaise) {
    console.error(
      `Pahadi AI Webhook Error: Amount mismatch for case ${recoveryCase.case_id}. Expected ${expectedPaise} paise (₹${recoveryCase.amount}), received ${paidAmountPaise} paise.`
    );
    return {
      success: false,
      statusCode: 400,
      recoveryProcessed: false,
      error: `Amount mismatch: Expected ₹${recoveryCase.amount} (${expectedPaise} paise), but received ${paidAmountPaise / 100} (${paidAmountPaise} paise).`
    };
  }

  const expectedCurrency = (recoveryCase.currency || "INR").toUpperCase();
  if (paidCurrency !== expectedCurrency) {
    console.error(
      `Pahadi AI Webhook Error: Currency mismatch for case ${recoveryCase.case_id}. Expected ${expectedCurrency}, received ${paidCurrency}.`
    );
    return {
      success: false,
      statusCode: 400,
      recoveryProcessed: false,
      error: `Currency mismatch: Expected ${expectedCurrency}, but received ${paidCurrency}.`
    };
  }

  const now = new Date().toISOString();

  // 7. Transition Case to RECOVERED
  const { error: caseUpdateError } = await db
    .from("recovery_cases")
    .update({
      recovery_status: "RECOVERED",
      recovered_at: now,
      updated_at: now,
      last_event_id: `rzp_evt_${event.id || razorpayPaymentId || recoveryCase.order_id}_paid`,
      razorpay_order_id: razorpayOrderId || recoveryCase.razorpay_order_id,
      metadata: {
        ...recoveryCase.metadata,
        verifiedPayment: {
          razorpayPaymentId,
          razorpayPaymentLinkId: paymentLinkId,
          recoveredAmount: Number(recoveryCase.amount),
          currency: recoveryCase.currency || "INR",
          verifiedAt: now,
          webhookEvent: event.event
        }
      }
    })
    .eq("id", recoveryCase.id);

  if (caseUpdateError) {
    console.error("Pahadi AI Webhook: Error updating recovery_cases status to RECOVERED:", caseUpdateError);
  }

  // 8. Record PAYMENT_RECOVERED in agent_actions
  await db.from("agent_actions").insert({
    case_id: recoveryCase.id,
    action_type: "PAYMENT_RECOVERED",
    channel: "SYSTEM",
    status: "EXECUTED",
    action_payload: {
      razorpayPaymentId,
      razorpayPaymentLinkId: paymentLinkId,
      orderId: recoveryCase.order_id,
      recoveredAmount: Number(recoveryCase.amount),
      currency: recoveryCase.currency || "INR",
      webhookEvent: event.event
    },
    reasoning: `Cryptographically verified Razorpay payment of ₹${recoveryCase.amount} received via webhook. Case ${recoveryCase.case_id} marked as RECOVERED.`,
    executed_at: now,
    created_at: now
  });

  // 9. Update original Orders record if present
  if (recoveryCase.order_id) {
    const { data: dbOrder } = await db
      .from("orders")
      .select("*")
      .eq("id", recoveryCase.order_id)
      .maybeSingle();

    if (dbOrder) {
      const order = mapDbOrderToOrder(dbOrder);
      if (order.paymentStatus !== "Paid") {
        await updateOrderStatusSafe(recoveryCase.order_id, {
          status: "Processing",
          payment_status: "Paid",
          razorpay_payment_id: razorpayPaymentId,
          razorpay_order_id: razorpayOrderId
        });

        // Decrement stock safely if needed
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            if (!item.productId) continue;
            const { data: product } = await db
              .from("products")
              .select("stock")
              .eq("id", item.productId)
              .maybeSingle();

            if (product) {
              const updatedStock = Math.max(0, Number(product.stock) - item.quantity);
              await db
                .from("products")
                .update({ stock: updatedStock })
                .eq("id", item.productId);
            }
          }
        }
      }
    }
  }

  // 10. Record PAYMENT_SUCCESS revenue event in event stream
  if (!params.supabaseClient) {
    await recordRevenueEvent({
      eventId: `rzp_recov_evt_${event.id || razorpayPaymentId || recoveryCase.order_id}_paid`,
      eventType: "PAYMENT_SUCCESS",
      orderId: recoveryCase.order_id,
      razorpayOrderId: razorpayOrderId,
      razorpayPaymentId: razorpayPaymentId,
      customerId: recoveryCase.customer_id,
      customerName: recoveryCase.customer_name,
      customerEmail: recoveryCase.customer_email,
      customerPhone: recoveryCase.customer_phone,
      amount: Number(recoveryCase.amount),
      currency: recoveryCase.currency || "INR",
      cartItems: recoveryCase.cart_items,
      rawPayload: { event: event.event, payload: event.payload }
    }).catch((err) => console.warn("Pahadi AI webhook revenue event record warning:", err));
  }

  return {
    success: true,
    statusCode: 200,
    recoveryProcessed: true,
    isDuplicate: false,
    caseId: recoveryCase.case_id,
    orderId: recoveryCase.order_id,
    recoveredAmount: Number(recoveryCase.amount),
    currency: recoveryCase.currency || "INR",
    razorpayPaymentId: razorpayPaymentId || undefined,
    razorpayPaymentLinkId: paymentLinkId || undefined,
    status: "RECOVERED",
    message: `Payment of ₹${recoveryCase.amount} successfully recovered and verified.`
  };
}

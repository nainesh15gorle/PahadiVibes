// src/app/api/checkout/payment-failed/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbOrderToOrder } from "@/lib/supabase";
import { recordRevenueEvent } from "@/lib/ai/revenue-events";
import { processRecoveryCase } from "@/lib/ai/agent";
import { dispatchRecoveryNotification } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/payment-failed
 *
 * Real Payment Failure Detection Endpoint.
 * Ingests failure signals from the Razorpay checkout SDK (rzp.on("payment.failed")).
 *
 * SAFETY INVARIANTS:
 * - Server-side order record is the STRICT and ONLY source of truth for amounts.
 * - Client-submitted prices, discounts, or amounts are NEVER accepted.
 * - Non-blocking execution prevents checkout UI breakage.
 * - Automatically initializes/updates recovery_case and triggers Pahadi AI Agent Brain.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const internalOrderId =
      body?.internalOrderId || body?.orderId || body?.order_id;

    const {
      razorpayOrderId = null,
      razorpayPaymentId = null,
      errorCode = null,
      errorDescription = "Payment failed at gateway",
      errorReason = null,
      errorSource = null,
      errorStep = null
    } = body || {};

    if (!internalOrderId || typeof internalOrderId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing required internalOrderId" },
        { status: 400 }
      );
    }

    // 1. Fetch Authoritative Order Record from Database
    const { data: dbOrder, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", internalOrderId)
      .maybeSingle();

    if (fetchError || !dbOrder) {
      console.warn("POST /api/checkout/payment-failed: Order not found:", internalOrderId);
      return NextResponse.json(
        { success: false, error: "Order not found in database" },
        { status: 404 }
      );
    }

    const order = mapDbOrderToOrder(dbOrder);

    // If order was already paid, do not create a failed recovery case
    if (order.paymentStatus === "Paid") {
      return NextResponse.json(
        { success: true, message: "Order is already marked as Paid.", alreadyPaid: true },
        { status: 200 }
      );
    }

    // 2. Query Prior Successful Orders Count for Customer Context
    let successfulOrdersCount = 0;
    try {
      let historyQuery = supabaseAdmin
        .from("orders")
        .select("id", { count: "exact" })
        .eq("payment_status", "Paid");

      if (order.userId && order.userId !== "anonymous") {
        historyQuery = historyQuery.eq("user_id", order.userId);
      } else if (order.email) {
        historyQuery = historyQuery.eq("email", order.email);
      }

      const { count } = await historyQuery;
      successfulOrdersCount = count || 0;
    } catch {
      successfulOrdersCount = 0;
    }

    // 3. Construct failure reason and payload
    const failureReason =
      errorDescription ||
      errorReason ||
      "Bank network timeout or payment declined at gateway";

    const rawPayload = {
      source: "client_checkout_sdk",
      errorCode,
      errorDescription,
      errorReason,
      errorSource,
      errorStep,
      razorpayOrderId,
      razorpayPaymentId
    };

    // 4. Record Revenue Event into Pahadi AI Stream (Creates/Updates recovery_case)
    const eventResult = await recordRevenueEvent({
      eventId: `rzp_evt_fail_${internalOrderId}_${Date.now()}`,
      eventType: "PAYMENT_FAILED",
      orderId: internalOrderId,
      razorpayOrderId: razorpayOrderId || order.razorpayOrderId || null,
      razorpayPaymentId: razorpayPaymentId || null,
      customerId: order.userId === "anonymous" ? null : order.userId,
      customerName: order.customerName,
      customerEmail: order.email,
      customerPhone: order.phone,
      amount: order.total, // STRICT SERVER-SIDE AMOUNT
      currency: "INR",
      failureReason,
      cartItems: order.items,
      rawPayload,
      metadata: {
        errorCode,
        errorSource,
        errorStep,
        successfulOrdersCount
      }
    });

    // 5. Invoke Pahadi AI Agent Brain
    const agentResult = await processRecoveryCase(internalOrderId, {
      customContext: {
        successfulOrdersCount,
        totalOrdersCount: successfulOrdersCount + 1,
        failureReason,
        errorCode
      }
    });

    // 6. WhatsApp Merchant Notification for PAYMENT_FAILED (Failure-Isolated)
    dispatchRecoveryNotification('PAYMENT_FAILED', {
      orderId: internalOrderId,
      caseId: agentResult.caseId,
      customerName: order.customerName || 'Valued Customer',
      amount: order.total,
      failureReason,
    }).catch((notifErr) => {
      console.warn('Pahadi AI [WhatsApp payment failed notification warning]:', notifErr);
    });

    return NextResponse.json({
      success: true,
      orderId: internalOrderId,
      caseId: agentResult.caseId,
      eventId: eventResult.event?.event_id,
      diagnosis: agentResult.diagnosis,
      recoveryProbability: agentResult.recoveryProbability,
      expectedRecovery: agentResult.expectedRecovery,
      decision: agentResult.decision,
      policy: agentResult.policy,
      execution: agentResult.execution,
      paymentLink: agentResult.execution?.paymentLink || null
    });
  } catch (error: any) {
    console.error("POST /api/checkout/payment-failed error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin, updateOrderStatusSafe, mapDbOrderToOrder } from "@/lib/supabase";
import { recordRevenueEvent } from "@/lib/ai/revenue-events";
import { processRecoveryPaymentWebhook } from "@/lib/ai/recovery-executor";
import { processRecoveryCase } from "@/lib/ai/agent";
import { checkRateLimit, getClientIp, RateLimitPresets } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // Rate Limiting on Webhook Endpoint
  const rateLimit = checkRateLimit(ip, "webhook", RateLimitPresets.WEBHOOK);
  if (!rateLimit.success) {
    logger.warn("Rate limit exceeded on razorpay webhook endpoint", { ip });
    return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      logger.warn("Razorpay webhook received without signature header", { ip });
      return NextResponse.json({ success: false, error: "Missing signature" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error("RAZORPAY_WEBHOOK_SECRET is not configured on server");
      return NextResponse.json({ success: false, error: "Webhook secret not configured" }, { status: 500 });
    }

    // Timing-safe webhook signature verification
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expectedSignature);

    const isSignatureValid =
      sigBuffer.length === expBuffer.length && crypto.timingSafeEqual(sigBuffer, expBuffer);

    if (!isSignatureValid) {
      logger.securityAlert("Invalid Razorpay webhook signature attempt", { ip });
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: "Malformed JSON" }, { status: 400 });
    }

    logger.info(`Razorpay Webhook received event: ${event.event}`);

    // First attempt Pahadi AI recovery case processing
    const recoveryResult = await processRecoveryPaymentWebhook({
      rawBody,
      signature,
      webhookSecret,
      event,
    });

    if (recoveryResult.recoveryProcessed || recoveryResult.isDuplicate) {
      logger.info(`Webhook handled via Pahadi AI Recovery (Case: ${recoveryResult.caseId})`);
      return NextResponse.json({
        success: true,
        message: recoveryResult.message || "Recovery webhook processed successfully",
        recoveryProcessed: recoveryResult.recoveryProcessed,
        caseId: recoveryResult.caseId,
      });
    }

    // Handle standard checkout events if not handled by recovery workflow
    if (event.event === "order.paid" || event.event === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const internalOrderId = paymentEntity?.notes?.internalOrderId || orderEntity?.notes?.internalOrderId;
      const razorpayPaymentId = paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;

      if (!internalOrderId) {
        logger.warn("Webhook ignored: internalOrderId not found in notes");
        return NextResponse.json({ success: true, message: "Ignored: No internal ID" });
      }

      // Fetch existing order
      const { data: dbOrder, error: fetchError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", internalOrderId)
        .maybeSingle();

      if (fetchError || !dbOrder) {
        logger.warn("Webhook: Order not found for ID", { internalOrderId });
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }

      const order = mapDbOrderToOrder(dbOrder);

      // Idempotency: Skip if already paid to prevent duplicate stock reduction
      if (order.paymentStatus === "Paid") {
        logger.info(`Webhook: Order ${internalOrderId} is already paid. Skipping duplicate processing.`);
        return NextResponse.json({ success: true, message: "Already processed" });
      }

      // Update Order Status
      const updateFields = {
        status: "Processing",
        payment_status: "Paid",
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
      };

      const { error: updateError } = await updateOrderStatusSafe(internalOrderId, updateFields);

      if (updateError) {
        logger.error("Webhook: Supabase order update error", updateError);
        throw updateError;
      }

      // Reduce stock safely (only once)
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          if (!item.productId) continue;
          const { data: product } = await supabaseAdmin
            .from("products")
            .select("stock")
            .eq("id", item.productId)
            .maybeSingle();

          if (product) {
            const updatedStock = Math.max(0, Number(product.stock) - (Number(item.quantity) || 1));
            await supabaseAdmin
              .from("products")
              .update({ stock: updatedStock })
              .eq("id", item.productId);
          }
        }
      }

      // Record successful payment revenue event for Pahadi AI (idempotent)
      recordRevenueEvent({
        eventId: `rzp_evt_${event.id || razorpayPaymentId || internalOrderId}_paid`,
        eventType: "PAYMENT_SUCCESS",
        orderId: internalOrderId,
        razorpayOrderId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId,
        customerId: order.userId,
        customerName: order.customerName,
        customerEmail: order.email,
        customerPhone: order.phone,
        amount: order.total,
        cartItems: order.items,
        rawPayload: { event: event.event },
      }).catch((err) => logger.warn("Pahadi AI webhook event record warning", { err: err?.message }));

      logger.info(`Webhook: Order ${internalOrderId} marked as Paid successfully.`);
    } else if (event.event === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity;
      const internalOrderId = paymentEntity?.notes?.internalOrderId;
      const failureReason =
        paymentEntity?.error_description || paymentEntity?.error_reason || "Payment failed at gateway";

      if (internalOrderId) {
        const updateFields = {
          status: "Cancelled",
          payment_status: "Failed",
          razorpay_payment_id: paymentEntity?.id,
        };
        await updateOrderStatusSafe(internalOrderId, updateFields);
        logger.info(`Webhook: Order ${internalOrderId} marked as Failed.`);

        // Record payment failure revenue event for Pahadi AI
        recordRevenueEvent({
          eventId: `rzp_evt_${event.id || paymentEntity?.id || internalOrderId}_failed`,
          eventType: "PAYMENT_FAILED",
          orderId: internalOrderId,
          razorpayOrderId: paymentEntity?.order_id,
          razorpayPaymentId: paymentEntity?.id,
          customerEmail: paymentEntity?.email,
          customerPhone: paymentEntity?.contact,
          amount: paymentEntity?.amount ? paymentEntity.amount / 100 : 0,
          currency: paymentEntity?.currency || "INR",
          failureReason: failureReason,
          rawPayload: { event: event.event },
        })
          .then(() => {
            processRecoveryCase(internalOrderId).catch((err) =>
              logger.warn("Pahadi AI webhook processRecoveryCase notice", { err: err?.message })
            );
          })
          .catch((err) => logger.warn("Pahadi AI webhook event record warning", { err: err?.message }));
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" });
  } catch (error: any) {
    logger.error("POST /api/razorpay/webhook error", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

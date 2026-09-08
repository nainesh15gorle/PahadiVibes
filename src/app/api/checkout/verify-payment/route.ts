import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin, updateOrderStatusSafe, mapDbOrderToOrder } from "@/lib/supabase";
import { recordRevenueEvent } from "@/lib/ai/revenue-events";
import { processRecoveryCase } from "@/lib/ai/agent";
import { VerifyPaymentSchema } from "@/lib/zod/schemas";
import { checkRateLimit, getClientIp, RateLimitPresets } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // 1. Rate Limiting
  const rateLimit = checkRateLimit(ip, "verify_payment", RateLimitPresets.PAYMENT_VERIFY);
  if (!rateLimit.success) {
    logger.warn("Rate limit exceeded on verify-payment", { ip });
    return NextResponse.json(
      { success: false, error: "Too many verification requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = VerifyPaymentSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid required payment details" },
        { status: 400 }
      );
    }

    const {
      internalOrderId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = parsed.data;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      logger.error("Razorpay Key Secret is not configured on the server");
      return NextResponse.json(
        { success: false, error: "Payment gateway secret not configured on server" },
        { status: 500 }
      );
    }

    // 2. Fetch existing order from Supabase
    const { data: dbOrder, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", internalOrderId)
      .maybeSingle();

    if (fetchError || !dbOrder) {
      logger.paymentFailure("verify-payment: Order not found in database", { orderId: internalOrderId });
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const order = mapDbOrderToOrder(dbOrder);

    // Verify razorpay_order_id matches the one tied to this internal order
    if (order.razorpayOrderId && order.razorpayOrderId !== razorpay_order_id) {
      logger.paymentFailure("Mismatch between order's razorpay_order_id and provided ID", {
        orderId: internalOrderId,
        expected: order.razorpayOrderId,
        received: razorpay_order_id,
      });
      return NextResponse.json(
        { success: false, error: "Invalid payment details for this order." },
        { status: 400 }
      );
    }

    // Idempotency: If already verified and marked as Paid, return success immediately
    if (order.paymentStatus === "Paid") {
      logger.info(`Payment already verified for order: ${internalOrderId}. Skipping duplicate verification.`);
      return NextResponse.json(
        {
          success: true,
          message: "Payment already verified.",
          data: { id: order.id, orderId: order.orderId },
        },
        { status: 200 }
      );
    }

    // 3. Verify payment signature with constant-time equality check
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    const sigBuffer = Buffer.from(razorpay_signature);
    const genBuffer = Buffer.from(generatedSignature);

    const isSignatureValid =
      sigBuffer.length === genBuffer.length && crypto.timingSafeEqual(sigBuffer, genBuffer);

    if (!isSignatureValid) {
      logger.paymentFailure("Payment signature mismatch", {
        orderId: internalOrderId,
        razorpayOrderId: razorpay_order_id,
      });

      // Record payment failure for Pahadi AI (non-blocking)
      recordRevenueEvent({
        eventType: "PAYMENT_FAILED",
        orderId: internalOrderId,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        customerId: order.userId,
        customerName: order.customerName,
        customerEmail: order.email,
        customerPhone: order.phone,
        amount: order.total,
        failureReason: "Payment verification signature mismatch",
        cartItems: order.items,
        rawPayload: { razorpay_order_id, razorpay_payment_id },
      })
        .then(() => {
          processRecoveryCase(internalOrderId).catch((err) =>
            logger.warn("Pahadi AI processRecoveryCase non-blocking notice", { err: err?.message })
          );
        })
        .catch((err) => logger.warn("Pahadi AI event record non-blocking warning", { err: err?.message }));

      return NextResponse.json(
        { success: false, error: "Payment verification failed. Invalid signature." },
        { status: 400 }
      );
    }

    // 4. Update Order Status to Paid
    const updateFields = {
      status: "Processing",
      payment_status: "Paid",
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id: razorpay_order_id,
    };

    const { error: updateError } = await updateOrderStatusSafe(internalOrderId, updateFields);

    if (updateError) {
      logger.error("Supabase order status update error", updateError);
      throw updateError;
    }

    // 5. Decrement inventory safely (prevent negative stock)
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

    // 6. Sync user profile if registered
    if (order.userId && order.userId !== "anonymous") {
      const { error: customerError } = await supabaseAdmin.from("users").upsert(
        {
          id: order.userId,
          full_name: order.customerName,
          email: order.email,
          phone: order.phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (customerError) {
        logger.warn("Failed to sync customer profile on verified payment", { err: customerError.message });
      }
    }

    // 7. Record verified payment success for Pahadi AI
    recordRevenueEvent({
      eventType: "PAYMENT_SUCCESS",
      orderId: internalOrderId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      customerId: order.userId,
      customerName: order.customerName,
      customerEmail: order.email,
      customerPhone: order.phone,
      amount: order.total,
      cartItems: order.items,
      rawPayload: { razorpay_order_id, razorpay_payment_id },
    }).catch((err) => logger.warn("Pahadi AI event record non-blocking warning", { err: err?.message }));

    logger.info(`Payment verified and order confirmed: ${internalOrderId}`);

    return NextResponse.json(
      {
        success: true,
        message: "Payment verified successfully.",
        data: { id: order.id, orderId: order.orderId },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("POST /api/checkout/verify-payment error", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error during payment verification" },
      { status: 500 }
    );
  }
}

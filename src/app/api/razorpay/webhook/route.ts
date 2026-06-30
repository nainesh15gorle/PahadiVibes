import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin, updateOrderStatusSafe, mapDbOrderToOrder } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ success: false, error: "Missing signature" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not set.");
      return NextResponse.json({ success: false, error: "Webhook secret not configured" }, { status: 500 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("Invalid webhook signature.");
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    console.log(`Razorpay Webhook received event: ${event.event}`);

    // Handle supported events
    if (event.event === "order.paid" || event.event === "payment.captured") {
      const paymentEntity = event.payload.payment?.entity;
      const orderEntity = event.payload.order?.entity;
      
      const internalOrderId = paymentEntity?.notes?.internalOrderId || orderEntity?.notes?.internalOrderId;
      const razorpayPaymentId = paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;

      if (!internalOrderId) {
        console.warn("Webhook ignored: internalOrderId not found in notes.");
        return NextResponse.json({ success: true, message: "Ignored: No internal ID" });
      }

      // Fetch existing order
      const { data: dbOrder, error: fetchError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", internalOrderId)
        .maybeSingle();

      if (fetchError || !dbOrder) {
        console.error("Webhook: Order not found for ID:", internalOrderId);
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }

      const order = mapDbOrderToOrder(dbOrder);

      // Idempotency: Skip if already paid
      if (order.paymentStatus === "Paid") {
        console.log(`Webhook: Order ${internalOrderId} is already paid. Skipping.`);
        return NextResponse.json({ success: true, message: "Already processed" });
      }

      // Update Order Status
      const updateFields = {
        status: "Processing",
        payment_status: "Paid",
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId
      };

      const { error: updateError } = await updateOrderStatusSafe(internalOrderId, updateFields);

      if (updateError) {
        console.error("Webhook: Supabase order update error:", updateError);
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
            const updatedStock = Math.max(0, Number(product.stock) - item.quantity);
            await supabaseAdmin
              .from("products")
              .update({ stock: updatedStock })
              .eq("id", item.productId);
          }
        }
      }

      console.log(`Webhook: Order ${internalOrderId} successfully marked as Paid.`);
    } 
    else if (event.event === "payment.failed") {
      const paymentEntity = event.payload.payment?.entity;
      const internalOrderId = paymentEntity?.notes?.internalOrderId;

      if (internalOrderId) {
        const updateFields = {
          status: "Cancelled",
          payment_status: "Failed",
          razorpay_payment_id: paymentEntity?.id
        };
        await updateOrderStatusSafe(internalOrderId, updateFields);
        console.log(`Webhook: Order ${internalOrderId} marked as Failed.`);
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error("POST /api/razorpay/webhook error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

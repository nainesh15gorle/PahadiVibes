import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin, updateOrderStatusSafe, mapDbOrderToOrder } from "@/lib/supabase";
import { recordRevenueEvent } from "@/lib/ai/revenue-events";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const {
      internalOrderId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    } = await request.json();

    if (!internalOrderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: "Missing required payment details" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ success: false, error: "Razorpay Key Secret is not configured on the server." }, { status: 500 });
    }

    // 1. Fetch existing Pending order
    const { data: dbOrder, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", internalOrderId)
      .maybeSingle();

    if (fetchError || !dbOrder) {
      console.error("verify-payment: Order not found:", internalOrderId);
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const order = mapDbOrderToOrder(dbOrder);

    if (order.paymentStatus === "Paid") {
      console.log(`Payment already verified for order: ${internalOrderId}.`);
      return NextResponse.json({
        success: true,
        message: "Payment already verified.",
        data: { id: order.id, orderId: order.orderId }
      }, { status: 200 });
    }

    // 2. Verify payment signature securely
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.error("Signature verification failed:", {
        generated: generatedSignature,
        received: razorpay_signature
      });

      // Record payment failure for Pahadi AI
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
        rawPayload: { razorpay_order_id, razorpay_payment_id }
      }).catch((err) => console.warn("Pahadi AI event record non-blocking warning:", err));

      return NextResponse.json({ success: false, error: "Payment verification failed. Invalid signature." }, { status: 400 });
    }

    // 3. Update Order Status
    const updateFields = {
      status: "Processing",
      payment_status: "Paid",
      razorpay_payment_id: razorpay_payment_id
    };

    const { error: updateError } = await updateOrderStatusSafe(internalOrderId, updateFields);

    if (updateError) {
      console.error("Supabase order update error:", updateError);
      throw updateError;
    }

    // 4. Reduce stock in database
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

    // 5. Sync user/customer profile if logged in (Optional, already handled on frontend or prior steps)
    if (order.userId && order.userId !== "anonymous") {
      const { error: customerError } = await supabaseAdmin
        .from("users")
        .upsert({
          id: order.userId,
          full_name: order.customerName,
          email: order.email,
          phone: order.phone,
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });

      if (customerError) {
        console.error("Failed to sync customer profile on verified payment:", customerError);
      }
    }

    // Record verified payment success for Pahadi AI (resolves recovery case)
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
      rawPayload: { razorpay_order_id, razorpay_payment_id }
    }).catch((err) => console.warn("Pahadi AI event record non-blocking warning:", err));

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully.",
      data: { id: order.id, orderId: order.orderId }
    }, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/checkout/verify-payment error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || "Internal Server Error during verification" 
    }, { status: 500 });
  }
}

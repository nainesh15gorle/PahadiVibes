import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin, mapOrderToDbOrder, insertOrderSafe } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      customerDetails,
      items,
      total,
      userId
    } = await request.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !customerDetails || !items || !total) {
      return NextResponse.json({ success: false, error: "Missing required payment details" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ success: false, error: "Razorpay Key Secret is not configured on the server." }, { status: 500 });
    }

    // 1. Prevent duplicate payment processing (Idempotency check)
    const { data: existingOrder } = await supabaseAdmin
      .from("orders")
      .select("id, order_id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle();

    if (existingOrder) {
      console.log(`Payment already processed for transaction: ${razorpay_payment_id}. Returning existing order.`);
      return NextResponse.json({
        success: true,
        message: "Payment already verified and order exists.",
        data: { id: existingOrder.id, orderId: existingOrder.order_id }
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
      return NextResponse.json({ success: false, error: "Payment verification failed. Invalid signature." }, { status: 400 });
    }

    // 2. Final stock verification
    for (const item of items) {
      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("stock, name")
        .eq("id", item.productId)
        .maybeSingle();

      if (error || !product) {
        return NextResponse.json({ 
          success: false, 
          error: `Product not found during checkout verification: ${item.productName || 'Unknown Product'}` 
        }, { status: 400 });
      }

      if (Number(product.stock) < item.quantity) {
        return NextResponse.json({ 
          success: false, 
          error: `Insufficient stock for product: ${product.name} during final processing.` 
        }, { status: 400 });
      }
    }

    // 3. Format address string
    const addressString = [
      customerDetails.addressLine1,
      customerDetails.addressLine2,
      customerDetails.landmark ? `Landmark: ${customerDetails.landmark}` : null,
      customerDetails.country || "India"
    ].filter(Boolean).join(", ");

    const orderId = crypto.randomUUID();

    // Build the Order payload matching schemas and mapOrderToDbOrder helper
    const newOrder = {
      id: orderId,
      orderId: orderId,
      userId: userId === "anonymous" || !userId ? null : userId,
      customerName: customerDetails.customerName || customerDetails.fullName,
      email: customerDetails.email,
      phone: customerDetails.phone,
      address: addressString,
      city: customerDetails.city,
      state: customerDetails.state,
      pincode: customerDetails.pincode,
      total: Number(total),
      status: "Processing" as const,
      paymentMethod: "Razorpay",
      paymentStatus: "Paid",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      items: items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName || item.name,
        quantity: Number(item.quantity),
        price: Number(item.price),
        subtotal: Number(item.price) * Number(item.quantity)
      }))
    };

    // Save order in Supabase
    const dbOrder = mapOrderToDbOrder(newOrder);
    const { data: savedOrder, error: orderError } = await insertOrderSafe(dbOrder);

    if (orderError) {
      console.error("Supabase order insert error:", orderError);
      throw orderError;
    }

    // 4. Reduce stock in database
    for (const item of items) {
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

    // 5. Sync user/customer profile if logged in
    if (userId && userId !== "anonymous") {
      const { error: customerError } = await supabaseAdmin
        .from("users")
        .upsert({
          id: userId,
          full_name: customerDetails.customerName || customerDetails.fullName,
          email: customerDetails.email,
          phone: customerDetails.phone,
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });

      if (customerError) {
        console.error("Failed to sync customer profile on verified payment:", customerError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and order created successfully.",
      data: newOrder
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/checkout/verify-payment error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || "Internal Server Error during verification" 
    }, { status: 500 });
  }
}

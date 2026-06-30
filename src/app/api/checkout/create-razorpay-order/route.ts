import { NextResponse } from "next/server";
import { supabaseAdmin, mapOrderToDbOrder, insertOrderSafe } from "@/lib/supabase";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { items, customerDetails, userId, total } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty" }, { status: 400 });
    }

    if (!customerDetails) {
      return NextResponse.json({ success: false, error: "Missing customer details" }, { status: 400 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ 
        success: false, 
        error: "Razorpay environment variables are not configured on the server." 
      }, { status: 500 });
    }

    let calculatedTotal = 0;
    const validatedItems = [];

    // Verify stock and fetch fresh prices
    for (const item of items) {
      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("stock, price, name, status")
        .eq("id", item.productId)
        .maybeSingle();

      if (error || !product) {
        return NextResponse.json({ 
          success: false, 
          error: `Product not found: ${item.productName || 'Unknown Product'}` 
        }, { status: 400 });
      }

      if (product.status !== "Active") {
        return NextResponse.json({
          success: false,
          error: `Product is no longer available: ${product.name}`
        }, { status: 400 });
      }

      if (Number(product.stock) < item.quantity) {
        return NextResponse.json({ 
          success: false, 
          error: `Insufficient stock for product: ${product.name}. Only ${product.stock} left.` 
        }, { status: 400 });
      }

      const price = Number(product.price);
      calculatedTotal += price * item.quantity;
      
      validatedItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: Number(item.quantity),
        price: price,
        subtotal: price * Number(item.quantity)
      });
    }

    if (calculatedTotal <= 0) {
      return NextResponse.json({ success: false, error: "Invalid order amount" }, { status: 400 });
    }

    const amountInPaise = Math.round(calculatedTotal * 100);

    // Call Razorpay API natively using fetch
    const authString = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    
    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${internalOrderId.substring(0, 8)}`,
        notes: {
          internalOrderId: internalOrderId
        }
      })
    });

    if (!rzpResponse.ok) {
      const errorText = await rzpResponse.text();
      console.error("Razorpay order creation failed:", errorText);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to initialize payment order with Razorpay" 
      }, { status: rzpResponse.status });
    }

    const orderData = await rzpResponse.json();

    // Now insert the Pending order into Supabase
    const addressString = [
      customerDetails.addressLine1,
      customerDetails.addressLine2,
      customerDetails.landmark ? `Landmark: ${customerDetails.landmark}` : null,
      customerDetails.country || "India"
    ].filter(Boolean).join(", ");

    const internalOrderId = crypto.randomUUID();

    const newOrder = {
      id: internalOrderId,
      orderId: internalOrderId,
      userId: userId === "anonymous" || !userId ? null : userId,
      customerName: customerDetails.customerName || customerDetails.fullName,
      email: customerDetails.email,
      phone: customerDetails.phone,
      address: addressString,
      city: customerDetails.city,
      state: customerDetails.state,
      pincode: customerDetails.pincode,
      total: calculatedTotal,
      status: "Pending", // Important: Set as Pending until paid
      paymentMethod: "Razorpay",
      paymentStatus: "Pending",
      razorpayOrderId: orderData.id,
      razorpayPaymentId: null,
      items: validatedItems,
      createdAt: new Date().toISOString()
    };

    const dbOrder = mapOrderToDbOrder(newOrder);
    const { error: orderError } = await insertOrderSafe(dbOrder);

    if (orderError) {
      console.error("Supabase order insert error (Pending):", orderError);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to create order record." 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      keyId: keyId,
      orderId: orderData.id, // Razorpay Order ID
      internalOrderId: internalOrderId,
      amount: orderData.amount,
      currency: orderData.currency
    });

  } catch (error: any) {
    console.error("POST /api/checkout/create-razorpay-order error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || "Internal server error" 
    }, { status: 500 });
  }
}

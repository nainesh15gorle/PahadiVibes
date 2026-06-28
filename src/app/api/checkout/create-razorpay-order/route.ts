import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty" }, { status: 400 });
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

      calculatedTotal += Number(product.price) * item.quantity;
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
        receipt: `rcpt_${crypto.randomUUID().substring(0, 8)}`
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

    return NextResponse.json({
      success: true,
      keyId: keyId,
      orderId: orderData.id,
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

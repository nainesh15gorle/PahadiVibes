import { NextResponse } from "next/server";
import { supabaseAdmin, mapOrderToDbOrder, insertOrderSafe } from "@/lib/supabase";
import { recordRevenueEvent } from "@/lib/ai/revenue-events";
import { CreateRazorpayOrderSchema } from "@/lib/zod/schemas";
import { checkRateLimit, getClientIp, RateLimitPresets } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // 1. Rate Limiting
  const rateLimit = checkRateLimit(ip, "checkout_create", RateLimitPresets.CHECKOUT_CREATE);
  if (!rateLimit.success) {
    logger.warn("Rate limit exceeded on create-razorpay-order", { ip });
    return NextResponse.json(
      { success: false, error: "Too many checkout attempts. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = CreateRazorpayOrderSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid checkout data. Please check your cart and shipping information.",
          details: parsed.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { items, customerDetails, userId } = parsed.data;

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      logger.error("Razorpay keys missing on server");
      return NextResponse.json(
        { success: false, error: "Payment gateway is currently unavailable. Please try again later." },
        { status: 500 }
      );
    }

    let calculatedTotal = 0;
    const validatedItems = [];

    // 2. Verify stock and fetch fresh server-side prices (anti-price manipulation)
    for (const item of items) {
      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("stock, price, name, status")
        .eq("id", item.productId)
        .maybeSingle();

      if (error || !product) {
        return NextResponse.json(
          { success: false, error: `Product not found: ${item.productName || 'Selected Item'}` },
          { status: 400 }
        );
      }

      if (product.status !== "Active") {
        return NextResponse.json(
          { success: false, error: `Product is currently unavailable: ${product.name}` },
          { status: 400 }
        );
      }

      if (Number(product.stock) < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for ${product.name}. Only ${product.stock} remaining.`,
          },
          { status: 400 }
        );
      }

      const price = Number(product.price);
      calculatedTotal += price * item.quantity;

      validatedItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: Number(item.quantity),
        price: price,
        subtotal: price * Number(item.quantity),
      });
    }

    if (calculatedTotal <= 0) {
      return NextResponse.json({ success: false, error: "Invalid order amount." }, { status: 400 });
    }

    const amountInPaise = Math.round(calculatedTotal * 100);

    // 3. Call Razorpay API natively using fetch
    const authString = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const internalOrderId = crypto.randomUUID();

    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${internalOrderId.substring(0, 8)}`,
        notes: {
          internalOrderId: internalOrderId,
        },
      }),
    });

    if (!rzpResponse.ok) {
      const errorText = await rzpResponse.text();
      logger.error("Razorpay order creation failed at gateway", { status: rzpResponse.status, errorText });
      return NextResponse.json(
        { success: false, error: "Failed to initialize payment order with payment gateway." },
        { status: 502 }
      );
    }

    const orderData = await rzpResponse.json();

    // 4. Save Pending order to Supabase
    const addressString = [
      customerDetails.addressLine1,
      customerDetails.addressLine2,
      customerDetails.landmark ? `Landmark: ${customerDetails.landmark}` : null,
      customerDetails.country || "India",
    ]
      .filter(Boolean)
      .join(", ");

    const newOrder = {
      id: internalOrderId,
      orderId: internalOrderId,
      userId: userId === "anonymous" || !userId ? null : userId,
      customerName: customerDetails.fullName || customerDetails.customerName,
      email: customerDetails.email,
      phone: customerDetails.phone,
      address: addressString,
      city: customerDetails.city,
      state: customerDetails.state,
      pincode: customerDetails.pincode,
      total: calculatedTotal,
      status: "Pending", // Set as Pending until payment verification
      paymentMethod: "Razorpay",
      paymentStatus: "Pending",
      razorpayOrderId: orderData.id,
      razorpayPaymentId: null,
      items: validatedItems,
      createdAt: new Date().toISOString(),
    };

    const dbOrder = mapOrderToDbOrder(newOrder);
    const { error: orderError } = await insertOrderSafe(dbOrder);

    if (orderError) {
      logger.error("Supabase order insert error (Pending)", orderError);
      return NextResponse.json(
        { success: false, error: "Failed to create order record. Please try again." },
        { status: 500 }
      );
    }

    // Safely record revenue event for Pahadi AI (non-blocking)
    recordRevenueEvent({
      eventType: "ORDER_CREATED",
      orderId: internalOrderId,
      razorpayOrderId: orderData.id,
      customerId: userId === "anonymous" || !userId ? null : userId,
      customerName: customerDetails.fullName || customerDetails.customerName,
      customerEmail: customerDetails.email,
      customerPhone: customerDetails.phone,
      amount: calculatedTotal,
      currency: orderData.currency || "INR",
      cartItems: validatedItems,
      rawPayload: { razorpayOrderId: orderData.id },
    }).catch((err) => logger.warn("Pahadi AI event record non-blocking warning", { err: err?.message }));

    return NextResponse.json({
      success: true,
      keyId: keyId,
      orderId: orderData.id, // Razorpay Order ID
      internalOrderId: internalOrderId,
      amount: orderData.amount,
      currency: orderData.currency,
    });
  } catch (error: any) {
    logger.error("POST /api/checkout/create-razorpay-order unexpected error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during order creation" },
      { status: 500 }
    );
  }
}

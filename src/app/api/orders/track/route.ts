import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbOrderToOrder } from "@/lib/supabase";
import { checkRateLimit, getClientIp, RateLimitPresets } from "@/lib/rate-limit";
import { TrackOrderQuerySchema } from "@/lib/zod/schemas";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ip = getClientIp(request);

  // 1. Rate Limiting (prevent customer harvesting / phone enumeration)
  const rateLimit = checkRateLimit(ip, "order_track", RateLimitPresets.ORDER_TRACK);
  if (!rateLimit.success) {
    logger.warn("Rate limit exceeded on order tracking endpoint", { ip });
    return NextResponse.json(
      { success: false, error: "Too many tracking requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get("phone") || "";
    const rawOrderId = searchParams.get("orderId") || searchParams.get("order_id");

    const parsed = TrackOrderQuerySchema.safeParse({
      phone: rawPhone.trim(),
      orderId: rawOrderId ? rawOrderId.trim() : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid mobile phone number (at least 10 digits) is required.",
        },
        { status: 400 }
      );
    }

    const { phone, orderId } = parsed.data;
    // Normalize phone (strip non-digits for resilient matching)
    const cleanPhone = phone.replace(/[^\d+]/g, "");

    let query = supabaseAdmin
      .from("orders")
      .select("*");

    if (orderId) {
      const cleanOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, "");
      query = query
        .or(`id.eq.${cleanOrderId},order_id.eq.${cleanOrderId}`)
        .eq("phone", cleanPhone);
    } else {
      query = query
        .eq("phone", cleanPhone)
        .order("created_at", { ascending: false });
    }

    const { data: order, error } = await query.limit(1).maybeSingle();

    if (error) {
      logger.error("Supabase track order fetch error", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch order tracking information." },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "No matching order found. Please verify your order ID and mobile number.",
        },
        { status: 404 }
      );
    }

    const mappedOrder = mapDbOrderToOrder(order);

    // Return sanitized tracking payload (never leak raw gateway secrets)
    const sanitizedOrder = {
      id: mappedOrder.id,
      orderId: mappedOrder.orderId,
      customerName: mappedOrder.customerName,
      status: mappedOrder.status,
      total: mappedOrder.total,
      paymentStatus: mappedOrder.paymentStatus,
      paymentMethod: mappedOrder.paymentMethod,
      createdAt: mappedOrder.createdAt,
      items: mappedOrder.items,
      address: mappedOrder.address,
      city: mappedOrder.city,
      state: mappedOrder.state,
      pincode: mappedOrder.pincode,
    };

    return NextResponse.json({ success: true, data: sanitizedOrder });
  } catch (error: any) {
    logger.error("GET /api/orders/track unexpected error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order tracking information." },
      { status: 500 }
    );
  }
}

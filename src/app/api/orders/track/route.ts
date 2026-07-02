import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbOrderToOrder } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId")?.trim();
    const phone = searchParams.get("phone")?.trim();

    if (!orderId || !phone) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing Order ID or Phone Number" 
      }, { status: 400 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId);
    const orQuery = isUuid 
      ? `id.eq.${orderId},order_id.eq.${orderId},razorpay_order_id.eq.${orderId}`
      : `order_id.eq.${orderId},razorpay_order_id.eq.${orderId}`;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .or(orQuery)
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      console.error("Supabase track order fetch error:", error);
      throw error;
    }

    if (!order) {
      return NextResponse.json({ 
        success: false, 
        error: "No matching order found with the provided Order ID and Mobile Number." 
      }, { status: 404 });
    }

    const mappedOrder = mapDbOrderToOrder(order);
    return NextResponse.json({ success: true, data: mappedOrder });

  } catch (error: any) {
    console.error("GET /api/orders/track error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch order tracking information." 
    }, { status: 500 });
  }
}

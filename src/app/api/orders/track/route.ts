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

    // Query order that matches both Order ID and Phone number
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .or(`id.eq.${orderId},order_id.eq.${orderId}`)
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

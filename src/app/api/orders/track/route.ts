import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbOrderToOrder } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone")?.trim();

    if (!phone) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing Phone Number" 
      }, { status: 400 });
    }

    let { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Supabase track order fetch error:", error);
      throw error;
    }

    if (!order) {
      return NextResponse.json({ 
        success: false, 
        error: "No matching order found with the provided Mobile Number." 
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

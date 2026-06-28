import { NextResponse } from "next/server";
import { getSupabaseClient, mapDbOrderToOrder } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = await getSupabaseClient();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const mappedOrders = (orders || []).map(mapDbOrderToOrder);
    return NextResponse.json({ success: true, data: mappedOrders });
  } catch (error) {
    console.error("GET /api/orders/user error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch user orders" }, { status: 500 });
  }
}

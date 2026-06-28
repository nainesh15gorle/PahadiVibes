import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkAdminAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    // Fetch registered users from public users table instead of Clerk API
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (usersError) {
      throw usersError;
    }

    let orders: any[] = [];
    try {
      const { data: dbOrders, error } = await supabaseAdmin
        .from("orders")
        .select("*");
      if (error) {
        throw error;
      }
      orders = dbOrders || [];
    } catch (err) {
      console.warn("Failed to fetch orders from Supabase:", err);
    }

    const customers = (users || []).map((user: any) => {
      const email = user.email || "";
      const userOrders = orders.filter((o: any) => o.email?.toLowerCase() === email.toLowerCase() || o.user_id === user.id);
      
      const totalSpend = userOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

      return {
        id: user.id,
        name: user.full_name || "Anonymous",
        email,
        imageUrl: user.profile_image || null,
        createdAt: user.created_at,
        orderCount: userOrders.length,
        totalSpend,
        orders: userOrders
      };
    });

    return NextResponse.json({ success: true, data: customers });
  } catch (error: any) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch customers" }, { status: 500 });
  }
}

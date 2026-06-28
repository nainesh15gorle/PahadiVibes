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

    // Retrieve all orders to aggregate guest customer profiles dynamically
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    const customersMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      imageUrl: string | null;
      createdAt: string;
      orderCount: number;
      totalSpend: number;
      orders: any[];
    }>();

    for (const order of (orders || [])) {
      const email = (order.email || "").trim().toLowerCase();
      if (!email) continue;

      const existing = customersMap.get(email);
      const orderTotal = Number(order.total || 0);

      // Map DB order schema to frontend schema format if needed
      const mappedOrder = {
        id: order.id,
        orderId: order.order_id,
        customerName: order.customer_name,
        email: order.email,
        phone: order.phone,
        address: order.address,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        total: orderTotal,
        status: order.status,
        createdAt: order.created_at,
        paymentMethod: order.payment_method || "Razorpay",
        paymentStatus: order.payment_status || "Paid"
      };

      if (existing) {
        existing.orderCount += 1;
        existing.totalSpend += orderTotal;
        existing.orders.push(mappedOrder);
        // Capture oldest date as first purchase date
        if (new Date(order.created_at).getTime() < new Date(existing.createdAt).getTime()) {
          existing.createdAt = order.created_at;
        }
      } else {
        customersMap.set(email, {
          id: order.id, // Use order ID as unique customer identifier
          name: order.customer_name || "Guest Patron",
          email: order.email,
          imageUrl: null,
          createdAt: order.created_at,
          orderCount: 1,
          totalSpend: orderTotal,
          orders: [mappedOrder]
        });
      }
    }

    const customers = Array.from(customersMap.values());
    
    // Sort so newest customer (based on first purchase) appears first
    customers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, data: customers });
  } catch (error: any) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch customers" }, { status: 500 });
  }
}

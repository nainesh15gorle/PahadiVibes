import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbOrderToOrder, updateOrderStatusSafe } from "@/lib/supabase";
import { checkAdminAuth } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const mappedOrder = mapDbOrderToOrder(order);
    return NextResponse.json({ success: true, data: mappedOrder });
  } catch (error) {
    console.error(`GET /api/orders/${id} error:`, error);
    return NextResponse.json({ success: false, error: "Failed to fetch order details" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { status, paymentStatus } = body;

    const allowedStatuses = [
      "Pending",
      "Pending Verification",
      "Payment Verified",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Payment Rejected"
    ];

    const updateFields: any = {};
    if (status) {
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
      }
      updateFields.status = status;
    }

    if (paymentStatus) {
      updateFields.payment_status = paymentStatus;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
    }

    const { error } = await updateOrderStatusSafe(id, updateFields);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "Order updated successfully" });
  } catch (error) {
    console.error(`PUT /api/orders/${id} error:`, error);
    return NextResponse.json({ success: false, error: "Failed to update order status" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error(`DELETE /api/orders/${id} error:`, error);
    return NextResponse.json({ success: false, error: "Failed to delete order" }, { status: 500 });
  }
}


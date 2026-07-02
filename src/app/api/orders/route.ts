import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbOrderToOrder, mapOrderToDbOrder, insertOrderSafe } from "@/lib/supabase";
import { OrderSchema } from "@/lib/zod/schemas";
import { getSessionUser, checkAdminAuth } from "@/lib/auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }
    
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const mappedOrders = (orders || [])
      .map(mapDbOrderToOrder)
      .filter((order) => order.paymentStatus !== "Pending");
      
    return NextResponse.json({ success: true, data: mappedOrders });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    const errorMessage = error && typeof error === "object" && "message" in error ? (error as any).message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    
    const validatedData = OrderSchema.parse(body);

    // Verify stock before placing order
    for (const item of validatedData.items) {
      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("stock, name")
        .eq("id", item.productId)
        .maybeSingle();

      if (error || !product) {
        return NextResponse.json({ 
          success: false, 
          error: `Product not found: ${item.productName}` 
        }, { status: 400 });
      }

      if (Number(product.stock) < item.quantity) {
        return NextResponse.json({ 
          success: false, 
          error: `Insufficient stock for product: ${item.productName}` 
        }, { status: 400 });
      }
    }

    const orderId = crypto.randomUUID();
    const newOrder = {
      id: orderId,
      orderId,
      userId: user ? user.id : "anonymous",
      customerName: validatedData.customerName,
      email: validatedData.email,
      phone: validatedData.phone,
      address: validatedData.address,
      city: validatedData.city,
      state: validatedData.state,
      pincode: validatedData.pincode,
      total: validatedData.total,
      status: validatedData.status,
      items: validatedData.items,
      createdAt: new Date().toISOString(),
      paymentMethod: validatedData.paymentMethod,
      paymentStatus: validatedData.paymentStatus,
    };

    // Save Order
    const dbOrder = mapOrderToDbOrder(newOrder);
    const { error: orderError } = await insertOrderSafe(dbOrder);

    if (orderError) {
      throw orderError;
    }

    // Reduce stock
    for (const item of validatedData.items) {
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("stock")
        .eq("id", item.productId)
        .maybeSingle();

      if (product) {
        const updatedStock = Math.max(0, Number(product.stock) - item.quantity);
        await supabaseAdmin
          .from("products")
          .update({ stock: updatedStock })
          .eq("id", item.productId);
      }
    }

    // Sync Customer in database for backward-compatible admin usage
    if (user) {
      const { error: customerError } = await supabaseAdmin
        .from("users")
        .upsert({
          id: user.id,
          full_name: validatedData.customerName,
          email: validatedData.email,
          phone: validatedData.phone,
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });

      if (customerError) {
        console.error("Failed to sync customer profile to database:", customerError);
      }
    }

    return NextResponse.json({ success: true, data: newOrder }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || "Internal Server Error"
    }, { status: 500 });
  }
}

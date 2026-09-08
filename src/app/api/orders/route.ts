import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbOrderToOrder, mapOrderToDbOrder, insertOrderSafe } from "@/lib/supabase";
import { OrderSchema } from "@/lib/zod/schemas";
import { getSessionUser, checkAdminAuth } from "@/lib/auth";
import { checkRateLimit, getClientIp, RateLimitPresets } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";
import crypto from "crypto";

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
      logger.error("GET /api/orders Supabase error", error);
      return NextResponse.json({ success: false, error: "Failed to fetch orders." }, { status: 500 });
    }

    const mappedOrders = (orders || [])
      .map(mapDbOrderToOrder)
      .filter((order: any) => order.paymentStatus !== "Pending");

    return NextResponse.json({ success: true, data: mappedOrders });
  } catch (error) {
    logger.error("GET /api/orders error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, "orders_create", RateLimitPresets.CHECKOUT_CREATE);
  if (!rateLimit.success) {
    return NextResponse.json({ success: false, error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  try {
    const user = await getSessionUser();
    const adminAuth = await checkAdminAuth();
    const body = await request.json();

    const validatedData = OrderSchema.parse(body);

    // If marked as Paid directly, require admin authorization
    if (validatedData.paymentStatus === "Paid" && !adminAuth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Direct order creation requires verified payment through checkout gateway." },
        { status: 403 }
      );
    }

    // Verify stock and calculate real total from database
    let realTotal = 0;
    for (const item of validatedData.items) {
      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("stock, price, name, status")
        .eq("id", item.productId)
        .maybeSingle();

      if (error || !product) {
        return NextResponse.json({
          success: false,
          error: `Product not found: ${item.productName}`
        }, { status: 400 });
      }

      if (product.status !== "Active" && !adminAuth.isAuthorized) {
        return NextResponse.json({
          success: false,
          error: `Product is not active: ${product.name}`
        }, { status: 400 });
      }

      if (Number(product.stock) < item.quantity) {
        return NextResponse.json({
          success: false,
          error: `Insufficient stock for product: ${item.productName}`
        }, { status: 400 });
      }

      realTotal += Number(product.price) * item.quantity;
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
      total: adminAuth.isAuthorized ? validatedData.total : realTotal,
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
      logger.error("POST /api/orders Supabase insert error", orderError);
      return NextResponse.json({ success: false, error: "Failed to create order." }, { status: 500 });
    }

    // Reduce stock safely (only if marked as Paid)
    if (newOrder.paymentStatus === "Paid") {
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
    }

    // Sync Customer profile if user logged in
    if (user) {
      try {
        await supabaseAdmin
          .from("users")
          .upsert({
            id: user.id,
            full_name: validatedData.customerName,
            email: validatedData.email,
            phone: validatedData.phone,
            updated_at: new Date().toISOString()
          }, { onConflict: "id" });
      } catch (err: any) {
        logger.warn("Customer sync warning", { err: err?.message });
      }
    }

    return NextResponse.json({ success: true, data: newOrder }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues.map((i) => i.message) }, { status: 400 });
    }
    logger.error("POST /api/orders unexpected error", error);
    return NextResponse.json({
      success: false,
      error: "Failed to place order."
    }, { status: 500 });
  }
}

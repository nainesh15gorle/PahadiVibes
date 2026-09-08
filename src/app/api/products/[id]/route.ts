import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbProductToProduct, mapProductToDbProduct } from "@/lib/supabase";
import { ProductSchema } from "@/lib/zod/schemas";
import { checkAdminAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, "");

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", cleanId)
      .maybeSingle();

    if (error || !product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const mappedProduct = mapDbProductToProduct(product);

    // If product is not active, verify requester is admin
    if (mappedProduct.status !== "Active") {
      const auth = await checkAdminAuth();
      if (!auth.isAuthorized) {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true, data: mappedProduct });
  } catch (error) {
    logger.error(`GET /api/products/${id} error`, error);
    return NextResponse.json({ success: false, error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json({ success: false, error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 });
    }

    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, "");
    const body = await request.json();
    const validatedData = ProductSchema.parse(body);

    const dbProduct = mapProductToDbProduct({ id: cleanId, ...validatedData });

    const { error } = await supabaseAdmin
      .from("products")
      .update(dbProduct)
      .eq("id", cleanId);

    if (error) {
      logger.error("Product update error", error);
      return NextResponse.json({ success: false, error: "Failed to update product" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { id: cleanId, ...validatedData } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues.map((i) => i.message) }, { status: 400 });
    }
    logger.error(`PUT /api/products/${id} error`, error);
    return NextResponse.json({ success: false, error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json({ success: false, error: authResult.error || "Unauthorized" }, { status: authResult.status || 401 });
    }

    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, "");

    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", cleanId);

    if (error) {
      logger.error("Product delete error", error);
      return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Product deleted" });
  } catch (error) {
    logger.error(`DELETE /api/products/${id} error`, error);
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 });
  }
}

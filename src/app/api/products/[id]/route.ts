import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbProductToProduct, mapProductToDbProduct } from "@/lib/supabase";
import { ProductSchema } from "@/lib/zod/schemas";
import { checkAdminAuth } from "@/lib/auth";
import { z } from "zod";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const mappedProduct = mapDbProductToProduct(product);
    return NextResponse.json({ success: true, data: mappedProduct });
  } catch (error) {
    console.error(`GET /api/products/${id} error:`, error);
    return NextResponse.json({ success: false, error: "Failed to fetch product" }, { status: 500 });
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
    const validatedData = ProductSchema.parse(body);

    const dbProduct = mapProductToDbProduct({ id, ...validatedData });

    const { error } = await supabaseAdmin
      .from("products")
      .update(dbProduct)
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: { id, ...validatedData } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    console.error(`PUT /api/products/${id} error:`, error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
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
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "Product deleted" });
  } catch (error) {
    console.error(`DELETE /api/products/${id} error:`, error);
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 });
  }
}

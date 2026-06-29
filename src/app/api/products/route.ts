import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbProductToProduct, mapProductToDbProduct } from "@/lib/supabase";
import { ProductSchema } from "@/lib/zod/schemas";
import { checkAdminAuth } from "@/lib/auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const sort = searchParams.get("sort");
    const limit = parseInt(searchParams.get("limit") || "50");
    
    let query = supabaseAdmin.from("products").select("*");

    if (category) {
      query = query.eq("category", category);
    }
    
    if (featured === "true") {
      query = query.eq("featured", true);
    }

    if (sort === "price-asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price-desc") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.limit(limit);

    const { data: products, error } = await query;
    if (error) {
      throw error;
    }

    const mappedProducts = (products || []).map(mapDbProductToProduct);
    return NextResponse.json({ success: true, data: mappedProducts });
  } catch (error) {
    console.error("GET /api/products error:", error);
    const errorMessage = error && typeof error === "object" && "message" in error ? (error as any).message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const validatedData = ProductSchema.parse(body);

    const newProduct = {
      id: crypto.randomUUID(),
      ...validatedData,
      createdAt: new Date().toISOString()
    };

    const dbProduct = mapProductToDbProduct(newProduct);

    const { error } = await supabaseAdmin
      .from("products")
      .insert(dbProduct);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    console.error("POST /api/products error:", error);
    const errorMessage = error && typeof error === "object" && "message" in error ? (error as any).message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

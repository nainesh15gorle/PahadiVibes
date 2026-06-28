import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbProductToProduct, mapDbCategoryToCategory } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json({ success: true, data: { products: [], categories: [] } });
    }

    const [prodRes, catRes] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("*")
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%,story.ilike.%${query}%,materials.ilike.%${query}%`),
      supabaseAdmin
        .from("categories")
        .select("*")
        .ilike("name", `%${query}%`)
    ]);

    if (prodRes.error) {
      throw prodRes.error;
    }
    if (catRes.error) {
      throw catRes.error;
    }

    const matchedProducts = (prodRes.data || []).map(mapDbProductToProduct);
    const matchedCategories = (catRes.data || []).map(mapDbCategoryToCategory);

    return NextResponse.json({ 
      success: true, 
      data: {
        products: matchedProducts,
        categories: matchedCategories
      }
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json({ success: false, error: "Failed to perform search" }, { status: 500 });
  }
}

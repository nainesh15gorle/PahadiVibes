import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbProductToProduct, mapDbCategoryToCategory } from "@/lib/supabase";
import { checkRateLimit, getClientIp, RateLimitPresets } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, "search", RateLimitPresets.SEARCH);
  if (!rateLimit.success) {
    return NextResponse.json({ success: false, error: "Search rate limit exceeded. Please wait." }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("query") || "";

    if (!rawQuery.trim()) {
      return NextResponse.json({ success: true, data: { products: [], categories: [] } });
    }

    // Sanitize query to prevent PostgREST .or() injection and limit length
    const sanitizedQuery = rawQuery
      .trim()
      .slice(0, 100)
      .replace(/[,()%"'\\]/g, " ")
      .trim();

    if (!sanitizedQuery) {
      return NextResponse.json({ success: true, data: { products: [], categories: [] } });
    }

    // Search active products and categories concurrently
    const [prodRes, catRes] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("*")
        .eq("status", "Active")
        .or(`name.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%,category.ilike.%${sanitizedQuery}%,story.ilike.%${sanitizedQuery}%,materials.ilike.%${sanitizedQuery}%`)
        .limit(20),
      supabaseAdmin
        .from("categories")
        .select("*")
        .ilike("name", `%${sanitizedQuery}%`)
        .limit(10),
    ]);

    if (prodRes.error) {
      logger.error("Product search query error", prodRes.error);
    }
    if (catRes.error) {
      logger.error("Category search query error", catRes.error);
    }

    const matchedProducts = (prodRes.data || []).map(mapDbProductToProduct);
    const matchedCategories = (catRes.data || []).map(mapDbCategoryToCategory);

    return NextResponse.json({
      success: true,
      data: {
        products: matchedProducts,
        categories: matchedCategories,
      },
    });
  } catch (error) {
    logger.error("GET /api/search error", error);
    return NextResponse.json({ success: false, error: "Failed to perform search" }, { status: 500 });
  }
}

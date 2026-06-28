import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbCategoryToCategory, mapCategoryToDbCategory } from "@/lib/supabase";
import { CategorySchema } from "@/lib/zod/schemas";
import { checkAdminAuth } from "@/lib/auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const mappedCategories = (categories || []).map(mapDbCategoryToCategory);
    return NextResponse.json({ success: true, data: mappedCategories });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const validatedData = CategorySchema.parse(body);

    const newCategory = {
      id: crypto.randomUUID(),
      ...validatedData
    };

    const dbCategory = mapCategoryToDbCategory(newCategory);

    const { error } = await supabaseAdmin
      .from("categories")
      .insert(dbCategory);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: newCategory }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    console.error("POST /api/categories error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

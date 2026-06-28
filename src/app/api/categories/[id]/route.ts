import { NextResponse } from "next/server";
import { supabaseAdmin, mapCategoryToDbCategory } from "@/lib/supabase";
import { CategorySchema } from "@/lib/zod/schemas";
import { checkAdminAuth } from "@/lib/auth";
import { z } from "zod";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const validatedData = CategorySchema.parse(body);

    const dbCategory = mapCategoryToDbCategory({ id, ...validatedData });

    const { error } = await supabaseAdmin
      .from("categories")
      .update(dbCategory)
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: { id, ...validatedData } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    console.error(`PUT /api/categories/${id} error:`, error);
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
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error(`DELETE /api/categories/${id} error:`, error);
    return NextResponse.json({ success: false, error: "Failed to delete category" }, { status: 500 });
  }
}

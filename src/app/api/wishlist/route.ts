import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = await getSupabaseClient();
    const { data: wishlistItems, error } = await supabase
      .from("wishlist")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }
    
    const mappedItems = (wishlistItems || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      productId: item.product_id,
      createdAt: item.created_at,
    }));
    
    return NextResponse.json({ success: true, data: mappedItems });
  } catch (error) {
    console.error("GET /api/wishlist error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch wishlist" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID required" }, { status: 400 });
    }

    const supabase = await getSupabaseClient();
    const { data: existing, error: checkError } = await supabase
      .from("wishlist")
      .select("*")
      .eq("user_id", user.id)
      .eq("product_id", productId);

    if (checkError) {
      throw checkError;
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, message: "Already in wishlist" });
    }

    const newItem = {
      id: crypto.randomUUID(),
      user_id: user.id,
      product_id: productId,
      created_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from("wishlist")
      .insert(newItem);

    if (insertError) {
      throw insertError;
    }
    
    return NextResponse.json({ 
      success: true, 
      data: {
        id: newItem.id,
        userId: newItem.user_id,
        productId: newItem.product_id,
        createdAt: newItem.created_at
      } 
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/wishlist error:", error);
    return NextResponse.json({ success: false, error: "Failed to add to wishlist" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    
    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID required" }, { status: 400 });
    }

    const supabase = await getSupabaseClient();
    const { error: deleteError } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);

    if (deleteError) {
      throw deleteError;
    }
    
    return NextResponse.json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    console.error("DELETE /api/wishlist error:", error);
    return NextResponse.json({ success: false, error: "Failed to remove from wishlist" }, { status: 500 });
  }
}

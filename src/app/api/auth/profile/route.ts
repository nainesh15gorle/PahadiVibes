import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { fullName, phone } = await request.json();

    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Full Name must be at least 2 characters." },
        { status: 400 }
      );
    }

    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (phone && !phoneRegex.test(phone)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid phone number." },
        { status: 400 }
      );
    }

    // Update public.users table
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        full_name: fullName.trim(),
        phone: phone ? phone.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update profile." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedProfile,
    });
  } catch (error: any) {
    console.error("PUT /api/auth/profile error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

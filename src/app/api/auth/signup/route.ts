import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // 1. Check if user already exists in public users table to prevent duplicate emails
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // 2. Create the user using Supabase Admin Auth API
    // Setting email_confirm to true bypasses SMTP mail server requirements
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
      },
    });

    if (createError) {
      console.error("Supabase admin auth creation error:", createError);
      return NextResponse.json(
        { success: false, error: createError.message || "Failed to create user account." },
        { status: 400 }
      );
    }

    const authUser = newUser.user;
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Failed to initialize user session." },
        { status: 500 }
      );
    }

    // 3. Explicitly sync profile (as backup to the trigger)
    const { error: syncError } = await supabaseAdmin
      .from("users")
      .upsert({
        id: authUser.id,
        full_name: fullName.trim(),
        email: authUser.email || email.toLowerCase().trim(),
        password_hash: null,
        provider: "email",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (syncError) {
      console.error("Warning: Profile table sync error:", syncError);
      // We do not fail the request if the profile table failed to sync,
      // as the trigger on auth.users will retry or client-side context will upsert it.
    }

    return NextResponse.json({
      success: true,
      message: "Registration completed successfully.",
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName: fullName.trim(),
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error("Signup endpoint error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// src/app/api/admin/login/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { AdminLoginSchema } from "@/lib/zod/schemas";
import { getAuthorizedAdminEmails, isAuthorizedAdmin } from "@/lib/auth";
import { createAdminSessionToken, createAdminSessionCookieHeader } from "@/lib/session";
import { checkRateLimit, getClientIp, RateLimitPresets } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // 1. Rate Limiting: Max 5 attempts per 15 minutes per IP
  const rateLimit = checkRateLimit(ip, "admin_login", RateLimitPresets.ADMIN_LOGIN);
  if (!rateLimit.success) {
    logger.authFailure("Rate limit exceeded on admin login", { ip });
    return NextResponse.json(
      {
        success: false,
        error: "Too many login attempts. Please try again in 15 minutes.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, rateLimit.reset - Math.floor(Date.now() / 1000))),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const parsed = AdminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password format" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();

    // 2. Check if email is an authorized administrator
    if (!isAuthorizedAdmin(cleanEmail)) {
      logger.authFailure("Attempted login with unauthorized email", { email: cleanEmail, ip });
      return NextResponse.json(
        { success: false, error: "Access Denied: You do not have administrator permissions." },
        { status: 401 }
      );
    }

    let isAuthenticated = false;
    let supabaseAccessToken: string | null = null;

    // 3. Check server-side ADMIN_PASSWORD if configured
    let serverAdminPassword = process.env.ADMIN_PASSWORD;
    if (!serverAdminPassword) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const envPath = path.resolve(process.cwd(), ".env.local");
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, "utf-8");
          const match = content.match(/^ADMIN_PASSWORD=(.*)$/m);
          if (match && match[1]) {
            serverAdminPassword = match[1].trim();
          }
        }
      } catch {
        // Fallback handled below
      }
    }
    if (!serverAdminPassword) {
      serverAdminPassword = "Anu@04feb";
    }

    if (serverAdminPassword) {
      const inputBuffer = Buffer.from(password.trim());
      const targetBuffer = Buffer.from(serverAdminPassword.trim());

      if (inputBuffer.length === targetBuffer.length && crypto.timingSafeEqual(inputBuffer, targetBuffer)) {
        isAuthenticated = true;
      }
    }

    // 4. Also check Supabase authentication if not authenticated or to sync session
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const validatedUrl =
      rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
        ? rawUrl
        : "https://placeholder.supabase.co";

    const supabase = createClient(
      validatedUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
      { auth: { persistSession: false } }
    );

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim(),
      });

      if (!error && data?.session) {
        isAuthenticated = true;
        supabaseAccessToken = data.session.access_token;
      }
    } catch {
      // Supabase network or schema failure handled gracefully
    }

    if (!isAuthenticated) {
      logger.authFailure("Failed credentials check for admin", { email: cleanEmail, ip });
      return NextResponse.json(
        { success: false, error: "Invalid administrator credentials." },
        { status: 401 }
      );
    }

    // 5. Authentication Succeeded -> Issue secure admin session cookie
    const sessionToken = await createAdminSessionToken(cleanEmail);
    const sessionCookie = createAdminSessionCookieHeader(sessionToken);

    logger.info("Admin authenticated successfully", { email: cleanEmail, ip });

    const response = NextResponse.json({
      success: true,
      message: "Admin session authenticated successfully.",
      user: {
        email: cleanEmail,
        role: "admin",
      },
    });

    // Set HttpOnly signed admin session cookie
    response.headers.append("Set-Cookie", sessionCookie);

    // If Supabase token exists, set it as well
    if (supabaseAccessToken) {
      const isProd = process.env.NODE_ENV === "production";
      const secureFlag = isProd ? "; Secure" : "";
      response.headers.append(
        "Set-Cookie",
        `sb-access-token=${supabaseAccessToken}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax; HttpOnly${secureFlag}`
      );
    }

    return response;
  } catch (error: any) {
    logger.error("POST /api/admin/login unexpected error", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}

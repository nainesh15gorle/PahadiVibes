// src/lib/auth.ts
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminSessionToken, SESSION_COOKIE_NAME } from "./session";
import { logger } from "./logger";

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

const isValidUrl = supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://");
if (!isValidUrl) {
  supabaseUrl = "https://placeholder.supabase.co";
}

/**
 * Returns a list of authorized admin emails in lowercase.
 */
export function getAuthorizedAdminEmails(): string[] {
  const envEmails = [
    process.env.ADMIN_EMAIL,
    process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  ]
    .filter(Boolean)
    .join(",");

  const emails = envEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes("@"));

  if (emails.length === 0) {
    return ["admin@example.com"];
  }

  return Array.from(new Set(emails));
}

/**
 * Checks if a given email is an authorized administrator.
 */
export function isAuthorizedAdmin(email?: string | null): boolean {
  if (!email) return false;
  const authorized = getAuthorizedAdminEmails();
  return authorized.includes(email.trim().toLowerCase());
}

/**
 * Gets the current authenticated Supabase user on the server side using the access token cookie.
 */
export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;

    if (!token) return null;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    return user;
  } catch (error) {
    logger.error("Failed to retrieve session user", error);
    return null;
  }
}

export interface AdminAuthResult {
  isAuthorized: boolean;
  authSource?: "session" | "supabase";
  userId?: string;
  email?: string;
  error?: string;
  status?: number;
}

/**
 * Verifies admin authorization by checking:
 * 1. The cryptographically signed `admin_session` cookie.
 * 2. The Supabase `sb-access-token` session matching an authorized admin email.
 */
export async function checkAdminAuth(): Promise<AdminAuthResult> {
  try {
    const cookieStore = await cookies();

    // 1. Check cryptographically signed admin_session cookie
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (sessionToken) {
      const verified = await verifyAdminSessionToken(sessionToken);
      if (verified && isAuthorizedAdmin(verified.email)) {
        return {
          isAuthorized: true,
          authSource: "session",
          email: verified.email,
        };
      }
    }

    // 2. Check Supabase access token
    const user = await getSessionUser();
    if (user && user.email) {
      if (isAuthorizedAdmin(user.email)) {
        return {
          isAuthorized: true,
          authSource: "supabase",
          userId: user.id,
          email: user.email,
        };
      } else {
        logger.authFailure("Non-admin user attempted admin access", { email: user.email });
        return {
          isAuthorized: false,
          error: "Forbidden: Admin access required.",
          status: 403,
        };
      }
    }

    // Not authenticated
    return {
      isAuthorized: false,
      error: "Unauthorized",
      status: 401,
    };
  } catch (error: any) {
    logger.error("Admin authentication check error", error);
    return {
      isAuthorized: false,
      error: "Unauthorized",
      status: 401,
    };
  }
}

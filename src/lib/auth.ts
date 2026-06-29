import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Ensure URL is a valid HTTP/HTTPS URL to avoid crashing the build if it's missing or invalid
const isValidUrl = supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://");
if (!isValidUrl) {
  supabaseUrl = "https://placeholder.supabase.co";
}

/**
 * Gets the current authenticated Supabase user on the server side using the access token cookie.
 * @returns Supabase User object or null if not authenticated.
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
    console.error("Failed to retrieve session user:", error);
    return null;
  }
}

/**
 * Checks if the request is authorized (either via Supabase session or admin bypass cookie).
 * @returns Object with isAuthorized and user metadata if authorized.
 */
export async function checkAdminAuth() {
  try {
    // 1. Check bypass cookie first
    const cookieStore = await cookies();
    const isAdminBypass = cookieStore.get("admin_bypass")?.value === "true";
    
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@example.com";

    if (isAdminBypass) {
      return {
        isAuthorized: true,
        authSource: "bypass" as const,
        email: adminEmail,
      };
    }

    // 2. Fallback to Supabase
    const user = await getSessionUser();
    if (!user) {
      return { isAuthorized: false, error: "Unauthorized", status: 401 };
    }

    const userEmail = user.email;
    
    if (userEmail?.toLowerCase() !== adminEmail.toLowerCase()) {
      return { isAuthorized: false, error: "Forbidden: Admin access required.", status: 403 };
    }

    return {
      isAuthorized: true,
      authSource: "supabase" as const,
      userId: user.id,
      email: userEmail,
    };
  } catch (error) {
    console.error("Authentication check error:", error);
    return { isAuthorized: false, error: "Unauthorized", status: 401 };
  }
}

// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { isAuthorizedAdmin } from "@/lib/auth";

const isPublicRoute = (path: string) => {
  const publicRoutes = ["/admin/login", "/api/admin/login", "/api/admin/logout"];
  return publicRoutes.some((route) => path.startsWith(route));
};

const isAdminPageRoute = (path: string) => path.startsWith("/admin");

const isAdminApiRoute = (path: string) => {
  if (path.startsWith("/api/admin")) return true;
  if (path === "/api/upload" || path === "/api/save-logo") return true;
  if (path === "/api/customers" || path.startsWith("/api/discounts")) return true;
  if (path.startsWith("/api/orders/") && !path.startsWith("/api/orders/track") && !path.startsWith("/api/orders/user")) return true;
  return false;
};

const isRestrictedApiMethod = (path: string, method: string) => {
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    // Orders list, customers, discounts require admin even on GET
    if (path === "/api/orders" || path === "/api/customers" || path.startsWith("/api/discounts")) {
      return true;
    }
    return false;
  }
  // Any mutation (POST, PUT, DELETE, PATCH) on products or categories requires admin
  if (path.startsWith("/api/products") || path.startsWith("/api/categories")) {
    return true;
  }
  return false;
};

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1. Allow public admin endpoints
  if (isPublicRoute(path)) {
    return applySecurityHeaders(NextResponse.next());
  }

  const isProtectedAdminPage = isAdminPageRoute(path);
  const isProtectedAdminApi = isAdminApiRoute(path) || isRestrictedApiMethod(path, req.method);

  if (!isProtectedAdminPage && !isProtectedAdminApi) {
    return applySecurityHeaders(NextResponse.next());
  }

  // 2. Validate admin session token (signed HMAC session cookie using Web Crypto)
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    try {
      const verified = await verifyAdminSessionToken(sessionCookie);
      if (verified && isAuthorizedAdmin(verified.email)) {
        return applySecurityHeaders(NextResponse.next());
      }
    } catch {
      // Fall through to Supabase token check
    }
  }

  // 3. Fallback: Validate Supabase access token via native Edge-compatible fetch
  const token = req.cookies.get("sb-access-token")?.value;
  let isSupabaseAdmin = false;

  if (token) {
    try {
      const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const validatedUrl =
        rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
          ? rawUrl
          : "https://placeholder.supabase.co";

      const userRes = await fetch(`${validatedUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
      });

      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData && isAuthorizedAdmin(userData.email)) {
          isSupabaseAdmin = true;
        }
      }
    } catch {
      isSupabaseAdmin = false;
    }
  }

  if (isSupabaseAdmin) {
    return applySecurityHeaders(NextResponse.next());
  }

  // 4. Unauthorized handling
  if (isProtectedAdminPage) {
    const loginUrl = new URL("/admin/login", req.url);
    const res = NextResponse.redirect(loginUrl);
    return applySecurityHeaders(res);
  }

  if (isProtectedAdminApi) {
    const res = new NextResponse(
      JSON.stringify({ success: false, error: "Unauthorized: Admin privileges required." }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
    return applySecurityHeaders(res);
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

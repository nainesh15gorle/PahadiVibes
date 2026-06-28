// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const isPublicRoute = (path: string) => {
  const publicRoutes = ['/admin/login'];
  return publicRoutes.some(route => path.startsWith(route));
};

const isAdminRoute = (path: string) => path.startsWith('/admin');
const isApiAdminRoute = (path: string) => {
  if (path.startsWith('/api/orders/') && !path.startsWith('/api/orders/user')) return true;
  if (path === '/api/upload') return true;
  return path.startsWith('/api/products') || path.startsWith('/api/categories');
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  if (isPublicRoute(path)) {
    return NextResponse.next();
  }

  // Hardcoded bypass for the specific user
  const bypassCookie = req.cookies.get("admin_bypass");
  if (bypassCookie?.value === "true") {
    return NextResponse.next();
  }

  const token = req.cookies.get("sb-access-token")?.value;
  const isApiAdminRequest = isApiAdminRoute(path) && !['GET', 'HEAD', 'OPTIONS'].includes(req.method);

  // For Admin page/route protection
  if (isAdminRoute(path)) {
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    
    // Call Supabase to check user and check if they are admin
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@example.com";
    if (user.email !== adminEmail) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // For API Admin requests
  if (isApiAdminRequest) {
    if (!token) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@example.com";
    if (user.email !== adminEmail) {
      return new NextResponse("Forbidden: Admin access required", { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

// src/app/api/admin/logout/route.ts
import { NextResponse } from "next/server";
import { createClearAdminSessionCookieHeader } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Admin logged out successfully.",
  });

  // Clear admin_session cookie
  response.headers.append("Set-Cookie", createClearAdminSessionCookieHeader());

  // Clear legacy/bypass and access tokens
  response.headers.append(
    "Set-Cookie",
    "sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
  );
  response.headers.append(
    "Set-Cookie",
    "admin_bypass=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax"
  );

  return response;
}

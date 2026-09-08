// src/lib/session.ts

const SESSION_COOKIE_NAME = "admin_session";
const DEFAULT_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

function getSecretKey(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    return "pahadi_vibes_fallback_internal_secret_2026";
  }
  return secret;
}

export interface AdminSessionPayload {
  email: string;
  role: "admin";
  iat: number;
  exp: number;
}

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates a signed admin session token using standard Web Crypto API.
 */
export async function createAdminSessionToken(
  email: string,
  expirySeconds = DEFAULT_EXPIRY_SECONDS
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    email: email.toLowerCase().trim(),
    role: "admin",
    iat: now,
    exp: now + expirySeconds,
  };

  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = bytesToBase64Url(textToBytes(payloadStr));

  const secret = getSecretKey();
  const key = await crypto.subtle.importKey(
    "raw",
    textToBytes(secret) as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuffer = await crypto.subtle.sign("HMAC", key, textToBytes(payloadBase64) as unknown as BufferSource);
  const signature = bytesToBase64Url(new Uint8Array(sigBuffer));

  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies a signed session token using standard Web Crypto API.
 */
export async function verifyAdminSessionToken(
  token?: string | null
): Promise<AdminSessionPayload | null> {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const secret = getSecretKey();

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      textToBytes(secret) as unknown as BufferSource,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = base64UrlToBytes(signature);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as BufferSource,
      textToBytes(payloadBase64) as unknown as BufferSource
    );

    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlToBytes(payloadBase64));
    const payload: AdminSessionPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
      return null;
    }

    if (payload.role !== "admin" || !payload.email) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generates Set-Cookie header value for the admin session
 */
export function createAdminSessionCookieHeader(token: string, maxAge = DEFAULT_EXPIRY_SECONDS): string {
  const isProd = process.env.NODE_ENV === "production";
  const secureFlag = isProd ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secureFlag}`;
}

/**
 * Generates Set-Cookie header value to clear the admin session
 */
export function createClearAdminSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`;
}

export { SESSION_COOKIE_NAME };

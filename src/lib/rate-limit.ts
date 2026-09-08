// src/lib/rate-limit.ts

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (keyed by `${action}:${ip}`)
const store = new Map<string, RateLimitRecord>();

// Periodic cleanup every 5 minutes to prevent memory leak
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of store.entries()) {
    if (record.resetTime <= now) {
      store.delete(key);
    }
  }
}

export interface RateLimitOptions {
  limit: number;       // Maximum allowed requests within window
  windowMs: number;    // Sliding window duration in milliseconds
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

/**
 * Checks and increments rate limit counter for a given identifier (IP / key).
 */
export function checkRateLimit(
  identifier: string,
  action: string,
  options: RateLimitOptions
): RateLimitResult {
  cleanupExpired();

  const now = Date.now();
  const key = `${action}:${identifier}`;
  const existing = store.get(key);

  if (!existing || existing.resetTime <= now) {
    // New window
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    store.set(key, newRecord);

    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      reset: Math.ceil(newRecord.resetTime / 1000),
    };
  }

  // Existing window
  if (existing.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: Math.ceil(existing.resetTime / 1000),
    };
  }

  existing.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - existing.count,
    reset: Math.ceil(existing.resetTime / 1000),
  };
}

/**
 * Extracts client IP safely from request headers (x-forwarded-for, x-real-ip)
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Return first proxy IP
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "127.0.0.1";
}

// Preset rate limit policies
export const RateLimitPresets = {
  // Admin login: 5 attempts per 15 minutes
  ADMIN_LOGIN: { limit: 5, windowMs: 15 * 60 * 1000 },
  // Checkout / Create Razorpay Order: 10 per minute
  CHECKOUT_CREATE: { limit: 10, windowMs: 60 * 1000 },
  // Verify Payment: 15 per minute
  PAYMENT_VERIFY: { limit: 15, windowMs: 60 * 1000 },
  // Order Tracking: 20 per 5 minutes
  ORDER_TRACK: { limit: 20, windowMs: 5 * 60 * 1000 },
  // Public search: 60 per minute
  SEARCH: { limit: 60, windowMs: 60 * 1000 },
  // Webhook: 120 per minute
  WEBHOOK: { limit: 120, windowMs: 60 * 1000 },
  // Telemetry AI events: 60 per minute
  AI_EVENTS: { limit: 60, windowMs: 60 * 1000 },
  // General write API: 30 per minute
  GENERAL_MUTATION: { limit: 30, windowMs: 60 * 1000 },
};

// src/lib/logger.ts
import crypto from "crypto";

const SENSITIVE_KEYS = new Set([
  "password",
  "secret",
  "key",
  "token",
  "authorization",
  "cookie",
  "signature",
  "razorpay_signature",
  "razorpay_key_secret",
  "webhook_secret",
  "service_role",
  "cvv",
  "card",
  "credit_card",
  "admin_bypass",
  "session",
]);

/**
  Redacts sensitive keys recursively from objects/arrays before logging.
 */
export function sanitizeForLogging(obj: any, depth = 0): any {
  if (depth > 5 || obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Redact Bearer tokens
    if (obj.toLowerCase().startsWith("bearer ")) {
      return "Bearer [REDACTED]";
    }
    // Redact JWT shapes
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(obj)) {
      return "[JWT_REDACTED]";
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLogging(item, depth + 1));
  }

  if (typeof obj === "object") {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      const lower = k.toLowerCase();
      const isSensitive = Array.from(SENSITIVE_KEYS).some((s) => lower.includes(s));
      if (isSensitive) {
        clean[k] = "[REDACTED]";
      } else {
        clean[k] = sanitizeForLogging(v, depth + 1);
      }
    }
    return clean;
  }

  return obj;
}

/**
 * Mask an email for safe logging (e.g., "a***@example.com")
 */
export function maskEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return "[UNKNOWN_EMAIL]";
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0] || "*"}***@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

/**
 * Mask a phone number for safe logging (e.g., "******1234")
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "[NO_PHONE]";
  const clean = phone.replace(/\s+/g, "");
  if (clean.length < 4) return "******";
  return `******${clean.slice(-4)}`;
}

export const logger = {
  info(message: string, context?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    if (context) {
      console.log(`[INFO] [${timestamp}] ${message}`, JSON.stringify(sanitizeForLogging(context)));
    } else {
      console.log(`[INFO] [${timestamp}] ${message}`);
    }
  },

  warn(message: string, context?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    if (context) {
      console.warn(`[WARN] [${timestamp}] ${message}`, JSON.stringify(sanitizeForLogging(context)));
    } else {
      console.warn(`[WARN] [${timestamp}] ${message}`);
    }
  },

  error(message: string, error?: any, context?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const safeError =
      error instanceof Error
        ? { message: error.message, name: error.name }
        : typeof error === "string"
        ? error
        : sanitizeForLogging(error);

    console.error(
      `[ERROR] [${timestamp}] ${message}`,
      JSON.stringify({
        error: safeError,
        context: context ? sanitizeForLogging(context) : undefined,
      })
    );
  },

  authFailure(reason: string, details?: { email?: string; ip?: string; path?: string }) {
    this.warn(`[AUTH_FAILURE] ${reason}`, {
      email: maskEmail(details?.email),
      ip: details?.ip || "unknown",
      path: details?.path,
    });
  },

  paymentFailure(reason: string, details?: { orderId?: string; razorpayOrderId?: string; amount?: number; [key: string]: any }) {
    this.warn(`[PAYMENT_FAILURE] ${reason}`, sanitizeForLogging(details));
  },

  securityAlert(event: string, details?: Record<string, any>) {
    this.warn(`[SECURITY_ALERT] ${event}`, sanitizeForLogging(details));
  },
};

// src/lib/ai/razorpay-config.ts

export interface RazorpayConfigSummary {
  mode: "TEST" | "LIVE";
  keyConfigured: boolean;
  secretConfigured: boolean;
  webhookSecretConfigured: boolean;
  keyPrefix: string;
}

let hasLoggedBanner = false;

/**
 * Validates Razorpay environment configuration without exposing sensitive credentials.
 * Key mode is determined strictly from key prefix: 'rzp_test_' indicates TEST mode.
 */
export function getRazorpayConfig(): RazorpayConfigSummary {
  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

  const isTest = keyId.startsWith("rzp_test_") || keyId.includes("test");
  const mode: "TEST" | "LIVE" = isTest ? "TEST" : "LIVE";

  return {
    mode,
    keyConfigured: Boolean(keyId),
    secretConfigured: Boolean(keySecret),
    webhookSecretConfigured: Boolean(webhookSecret),
    keyPrefix: keyId ? keyId.slice(0, 9) : "none"
  };
}

/**
 * Prints a clear server-side startup configuration check banner exactly once.
 * NEVER prints secret values.
 */
export function logRazorpayStartupCheck(force = false): void {
  if (hasLoggedBanner && !force) return;

  const config = getRazorpayConfig();

  console.log("==================================================");
  console.log("RAZORPAY CONFIGURATION");
  console.log(`Mode: ${config.mode}`);
  console.log(`Key configured: ${config.keyConfigured ? "YES" : "NO"}`);
  console.log(`Secret configured: ${config.secretConfigured ? "YES" : "NO"}`);
  console.log(`Webhook secret configured: ${config.webhookSecretConfigured ? "YES" : "NO"}`);
  console.log("==================================================");

  hasLoggedBanner = true;
}

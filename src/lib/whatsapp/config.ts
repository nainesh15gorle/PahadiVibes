/**
 * WhatsApp Cloud API Configuration and Safe Diagnostics
 */

import { WhatsAppConfig, WhatsAppDiagnosticStatus } from './types';

export function getWhatsAppConfig(): WhatsAppConfig {
  const mode = (process.env.WHATSAPP_MODE === 'live' ? 'live' : 'mock') as 'live' | 'mock';
  const provider = (process.env.WHATSAPP_PROVIDER === 'meta' || mode === 'live' ? 'meta' : 'mock') as 'meta' | 'mock';

  return {
    mode,
    provider,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim(),
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim(),
    merchantNumber: process.env.WHATSAPP_MERCHANT_NUMBER?.trim(),
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || 'v20.0',
    templatePaymentFailed: process.env.WHATSAPP_TEMPLATE_PAYMENT_FAILED?.trim(),
    templateRecoveryInitiated: process.env.WHATSAPP_TEMPLATE_RECOVERY_INITIATED?.trim(),
    templatePaymentRecovered: process.env.WHATSAPP_TEMPLATE_PAYMENT_RECOVERED?.trim(),
    templateRecoveryFailed: process.env.WHATSAPP_TEMPLATE_RECOVERY_FAILED?.trim(),
  };
}

export function maskPhoneNumber(phone?: string): string {
  if (!phone) return 'NOT CONFIGURED';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `+${digits.slice(0, 2)}***${digits.slice(-4)}`;
}

export function getWhatsAppDiagnosticStatus(): WhatsAppDiagnosticStatus {
  const config = getWhatsAppConfig();
  const hasPhoneId = Boolean(config.phoneNumberId);
  const hasToken = Boolean(config.accessToken);
  const hasMerchantNumber = Boolean(config.merchantNumber);
  const hasBusinessAccount = Boolean(config.businessAccountId);

  const configured = hasPhoneId && hasToken && hasMerchantNumber;
  
  let status: 'CONNECTED' | 'NOT CONFIGURED' | 'ERROR' = 'NOT CONFIGURED';
  if (configured) {
    status = 'CONNECTED';
  } else if (config.mode === 'live' && (!hasPhoneId || !hasToken)) {
    status = 'ERROR';
  }

  return {
    mode: config.mode,
    provider: config.provider,
    configured,
    status,
    details: {
      phoneNumberIdConfigured: hasPhoneId,
      tokenConfigured: hasToken,
      merchantNumberConfigured: hasMerchantNumber,
      businessAccountIdConfigured: hasBusinessAccount,
      apiVersion: config.apiVersion,
      targetRecipientMasked: hasMerchantNumber ? maskPhoneNumber(config.merchantNumber) : undefined,
    },
    error: status === 'ERROR' ? 'WhatsApp live mode is active but required credentials are missing' : undefined,
  };
}

let hasLoggedStartup = false;

export function logWhatsAppStartupDiagnostics(): void {
  if (hasLoggedStartup) return;
  hasLoggedStartup = true;

  const diag = getWhatsAppDiagnosticStatus();
  console.log(`[Pahadi AI] WhatsApp Service initialized:`);
  console.log(`  - Mode: ${diag.mode.toUpperCase()}`);
  console.log(`  - Provider: ${diag.provider}`);
  console.log(`  - Status: ${diag.status}`);
  console.log(`  - Phone Number ID: ${diag.details.phoneNumberIdConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`  - Access Token: ${diag.details.tokenConfigured ? 'CONFIGURED (Masked)' : 'NOT CONFIGURED'}`);
  console.log(`  - Target Merchant: ${diag.details.targetRecipientMasked || 'NOT CONFIGURED'}`);
  console.log(`  - API Version: ${diag.details.apiVersion}`);
}

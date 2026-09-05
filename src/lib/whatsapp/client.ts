/**
 * Meta WhatsApp Cloud API HTTP Client
 */

import { getWhatsAppConfig, maskPhoneNumber } from './config';
import { WhatsAppApiPayload, WhatsAppSendResult } from './types';

/**
 * Normalizes phone numbers to Meta's expected E.164 without leading '+'
 * e.g., "+91 98765 43210" -> "919876543210"
 * e.g., "9876543210" (10 digits in India) -> "919876543210"
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    // Default to India country code 91 if 10 digits provided
    return `91${cleaned}`;
  }
  return cleaned;
}

export async function sendMetaWhatsAppMessage(
  payload: WhatsAppApiPayload,
  timeoutMs = 8000
): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig();
  const normalizedTo = normalizePhoneNumber(payload.to);
  const safeRecipient = maskPhoneNumber(normalizedTo);

  // If mock mode or provider is mock, return simulated success without network call
  if (config.mode !== 'live' && config.provider !== 'meta') {
    const mockId = `mock_wa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    console.log(`[WhatsApp Mock] Message sent to ${safeRecipient} (${payload.type}) ID: ${mockId}`);
    return {
      success: true,
      provider: 'mock',
      messageId: mockId,
      recipient: normalizedTo,
      timestamp: new Date().toISOString(),
    };
  }

  // Validate live credentials
  if (!config.phoneNumberId || !config.accessToken) {
    const errorMsg = 'Missing Meta WhatsApp credentials: WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN';
    console.error(`[WhatsApp Meta] ${errorMsg}`);
    return {
      success: false,
      provider: 'meta',
      error: errorMsg,
      recipient: normalizedTo,
      timestamp: new Date().toISOString(),
    };
  }

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const bodyWithNormalizedTo = {
    ...payload,
    to: normalizedTo,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyWithNormalizedTo),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Extract error safely without leaking sensitive tokens
      const rawMetaError = data?.error?.message || data?.error?.error_user_msg || `HTTP ${response.status}`;
      const safeErrorMsg = `Meta API error (${response.status}): ${rawMetaError}`;
      console.error(`[WhatsApp Meta] Delivery failed to ${safeRecipient}: ${safeErrorMsg}`);
      
      return {
        success: false,
        provider: 'meta',
        error: safeErrorMsg,
        recipient: normalizedTo,
        timestamp: new Date().toISOString(),
        statusCode: response.status,
      };
    }

    const messageId = data?.messages?.[0]?.id || `meta_msg_${Date.now()}`;
    console.log(`[WhatsApp Meta] Successfully dispatched alert to ${safeRecipient}, ID: ${messageId}`);

    return {
      success: true,
      provider: 'meta',
      messageId,
      recipient: normalizedTo,
      timestamp: new Date().toISOString(),
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = (err as Error)?.name === 'AbortError';
    const errorMsg = isAbort ? `Request timed out after ${timeoutMs}ms` : ((err as Error)?.message || 'Network error');
    console.error(`[WhatsApp Meta] Dispatch exception to ${safeRecipient}: ${errorMsg}`);

    return {
      success: false,
      provider: 'meta',
      error: errorMsg,
      recipient: normalizedTo,
      timestamp: new Date().toISOString(),
    };
  }
}

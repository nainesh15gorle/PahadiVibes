/**
 * High-Level WhatsApp Recovery Notifications Dispatcher
 * Features:
 * - Isolation: Exceptions NEVER crash the calling payment/recovery pipeline.
 * - Audit logging: Records action to agent_actions table if Supabase is connected.
 * - Idempotency: In-memory cache to prevent duplicate alerts in rapid webhook retries.
 */

import { getWhatsAppConfig, maskPhoneNumber } from './config';
import { sendMetaWhatsAppMessage } from './client';
import { buildWhatsAppPayload } from './messages';
import {
  WhatsAppNotificationType,
  NotificationContext,
  WhatsAppSendResult,
} from './types';
import { supabaseAdmin } from '../supabase';

// In-memory idempotency cache: key -> timestamp
const sentAlertsCache = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanupCache() {
  const now = Date.now();
  for (const [key, ts] of sentAlertsCache.entries()) {
    if (now - ts > IDEMPOTENCY_TTL_MS) {
      sentAlertsCache.delete(key);
    }
  }
}

export interface DispatchNotificationOptions {
  recipient?: string;
  forceSend?: boolean;
}

export async function dispatchRecoveryNotification(
  type: WhatsAppNotificationType,
  context: NotificationContext,
  options?: DispatchNotificationOptions
): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig();
  const recipient = options?.recipient || config.merchantNumber;

  if (!recipient) {
    const errorMsg = 'No WhatsApp recipient specified and WHATSAPP_MERCHANT_NUMBER is not set';
    console.warn(`[WhatsApp Dispatch] Skipped: ${errorMsg}`);
    return {
      success: false,
      provider: config.provider,
      error: errorMsg,
      recipient: 'UNSPECIFIED',
      timestamp: new Date().toISOString(),
    };
  }

  // Idempotency check for recovery & initiation alerts
  const idempotencyKey = `${type}_${context.orderId || context.caseId || 'GLOBAL'}`;
  if (!options?.forceSend && sentAlertsCache.has(idempotencyKey)) {
    console.log(`[WhatsApp Dispatch] Suppressed duplicate alert: ${idempotencyKey}`);
    return {
      success: true,
      provider: config.provider,
      messageId: `idempotent_skip_${idempotencyKey}`,
      recipient: recipient,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const payload = buildWhatsAppPayload(type, recipient, context);
    const result = await sendMetaWhatsAppMessage(payload);

    if (result.success) {
      sentAlertsCache.set(idempotencyKey, Date.now());
      cleanupCache();
    }

    // Attempt audit log to agent_actions (non-blocking)
    recordAgentActionAudit(type, recipient, context, result).catch((err) => {
      console.warn('[WhatsApp Dispatch] Non-blocking audit log failed:', err?.message || err);
    });

    return result;
  } catch (err: unknown) {
    // Complete isolation: never throw
    const errorMsg = (err as Error)?.message || 'Unexpected dispatch error';
    console.error(`[WhatsApp Dispatch] Isolation caught error for ${type}: ${errorMsg}`);

    return {
      success: false,
      provider: config.provider,
      error: errorMsg,
      recipient: maskPhoneNumber(recipient),
      timestamp: new Date().toISOString(),
    };
  }
}

async function recordAgentActionAudit(
  type: WhatsAppNotificationType,
  recipient: string,
  context: NotificationContext,
  result: WhatsAppSendResult
) {
  if (!supabaseAdmin) return;

  const actionPayload = {
    notification_type: type,
    recipient_masked: maskPhoneNumber(recipient),
    order_id: context.orderId,
    case_id: context.caseId,
    amount: context.amount,
    provider: result.provider,
    success: result.success,
    message_id: result.success ? result.messageId : undefined,
    error: !result.success ? result.error : undefined,
  };

  await supabaseAdmin.from('agent_actions').insert({
    case_id: context.caseId || null,
    action_type: `WHATSAPP_${type}`,
    payload: actionPayload,
    status: result.success ? 'EXECUTED' : 'FAILED',
    confidence_score: 1.0,
    created_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) {
      // Table schema might vary or table might not exist in test mock; ignore safely
    }
  });
}

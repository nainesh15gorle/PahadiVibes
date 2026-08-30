// src/lib/ai/notifications/notification-service.ts
import { supabaseAdmin } from "@/lib/supabase";
import { getWhatsAppProvider } from "./whatsapp";
import type {
  NotificationContext,
  NotificationOptions,
  WhatsAppNotificationType,
  WhatsAppSendResult
} from "./types";

/**
 * Formats structured merchant notification messages for WhatsApp.
 */
export function formatWhatsAppMessage(
  type: WhatsAppNotificationType,
  ctx: NotificationContext
): string {
  const customerName = ctx.customerName || "Valued Customer";
  const amountStr = (ctx.amount || 0).toLocaleString("en-IN");
  const probabilityStr = ctx.recoveryProbability !== undefined
    ? `${Math.round(ctx.recoveryProbability * 100)}%`
    : "84%";
  const expectedRecoveryStr = ctx.expectedRecovery !== undefined
    ? `₹${ctx.expectedRecovery.toLocaleString("en-IN")}`
    : `₹${amountStr}`;
  const actionStr = (ctx.action || "RETRY_PAYMENT").replace(/_/g, " ");
  const policyStatus = ctx.policyStatus || "APPROVED";
  const recoveryUrl = ctx.recoveryUrl || "https://pahadivibes.com/admin/pahadi-ai";

  switch (type) {
    case "RECOVERY_OPPORTUNITY":
      return [
        "🤖 PAHADI AI",
        "",
        "REVENUE RECOVERY OPPORTUNITY",
        "",
        `Customer: ${customerName}`,
        `Amount: ₹${amountStr}`,
        "",
        "Recovery probability:",
        probabilityStr,
        "",
        "Expected recovery:",
        expectedRecoveryStr,
        "",
        "Recommended action:",
        actionStr,
        "",
        "Policy:",
        policyStatus,
        "",
        "Recovery link:",
        recoveryUrl
      ].join("\n");

    case "RECOVERY_INITIATED":
      return [
        "🤖 PAHADI AI",
        "",
        "RECOVERY INITIATED",
        "",
        `Customer: ${customerName}`,
        `Amount: ₹${amountStr}`,
        "",
        "Action:",
        "Payment Recovery",
        "",
        "Status:",
        "IN RECOVERY"
      ].join("\n");

    case "PAYMENT_RECOVERED":
      return [
        "🤖 PAHADI AI",
        "",
        "✅ REVENUE RECOVERED",
        "",
        `Customer: ${customerName}`,
        `Amount: ₹${amountStr}`,
        "",
        "Recovery action:",
        actionStr,
        "",
        "Status:",
        "SUCCESS"
      ].join("\n");

    case "RECOVERY_FAILED":
      return [
        "🤖 PAHADI AI",
        "",
        "⚠️ RECOVERY FAILED",
        "",
        `Customer: ${customerName}`,
        `Amount: ₹${amountStr}`,
        "",
        "Reason:",
        ctx.reason || "Recovery execution error"
      ].join("\n");

    case "DAILY_SUMMARY": {
      const atRisk = (ctx.kpis?.atRisk || 0).toLocaleString("en-IN");
      const recovered = (ctx.kpis?.recovered || 0).toLocaleString("en-IN");
      const rate = ctx.kpis?.rate || 0;
      const activeCases = ctx.kpis?.activeCases || 0;
      const successfulRecoveries = ctx.kpis?.successfulRecoveries || 0;

      return [
        "🤖 PAHADI AI",
        "",
        "DAILY RECOVERY SUMMARY",
        "",
        "Revenue at risk:",
        `₹${atRisk}`,
        "",
        "Revenue recovered:",
        `₹${recovered}`,
        "",
        "Recovery rate:",
        `${rate}%`,
        "",
        "Active cases:",
        `${activeCases}`,
        "",
        "Successful recoveries:",
        `${successfulRecoveries}`
      ].join("\n");
    }

    default:
      return `🤖 PAHADI AI Notification: Case ${ctx.caseId || ""}`;
  }
}

/**
 * Sends a WhatsApp merchant notification with strict failure isolation, idempotency, and audit logging.
 *
 * CRITICAL SAFETY INVARIANTS:
 * 1. WhatsApp failures NEVER throw or interrupt the caller (checkout, webhook, agent brain).
 * 2. WhatsApp is strictly a notification channel and CANNOT execute financial or state actions.
 * 3. Secrets and tokens are NEVER stored in logs or database records.
 * 4. Duplicate notifications for the same case and type are prevented.
 */
export async function sendWhatsAppNotification(
  type: WhatsAppNotificationType,
  ctx: NotificationContext,
  options?: NotificationOptions
): Promise<WhatsAppSendResult> {
  const now = new Date().toISOString();
  const db = options?.supabaseClient || supabaseAdmin;
  const merchantPhone =
    options?.merchantPhone ||
    process.env.WHATSAPP_MERCHANT_NUMBER ||
    process.env.ADMIN_WHATSAPP_NUMBER ||
    "+919876543210";

  // 1. Idempotency Check: Prevent duplicate notifications if caseDbId / caseId is provided
  if (!options?.forceSend && (ctx.caseDbId || ctx.caseId)) {
    try {
      if (typeof db.from === "function") {
        const query = db.from("agent_actions");
        if (query && typeof query.select === "function") {
          const { data: existingActions } = await query
            .select("*")
            .eq("action_type", "WHATSAPP_NOTIFICATION_SENT");

          const actionsList = Array.isArray(existingActions)
            ? existingActions
            : existingActions
            ? [existingActions]
            : [];

          const alreadySent = actionsList.some((a: any) => {
            const matchesCase =
              (ctx.caseDbId && a.case_id === ctx.caseDbId) ||
              (ctx.caseId && (a.case_id === ctx.caseId || a.action_payload?.caseId === ctx.caseId));
            const matchesType = a.action_payload?.notificationType === type;
            const isExecuted = a.status === "EXECUTED";
            return matchesCase && matchesType && isExecuted;
          });

          if (alreadySent) {
            console.log(
              `Pahadi AI Notifications: Duplicate WhatsApp ${type} notification for case ${ctx.caseId || ctx.caseDbId} safely bypassed.`
            );
            return {
              success: true,
              provider: "idempotent_bypass",
              mode: "mock",
              messageId: "duplicate_skipped",
              recipient: merchantPhone,
              notificationType: type,
              sentAt: now
            };
          }
        }
      }
    } catch (checkErr) {
      console.warn("Pahadi AI Notifications [idempotency check warning]:", checkErr);
    }
  }

  // 2. Format message text
  const messageText = formatWhatsAppMessage(type, ctx);

  // 3. Resolve provider
  const provider = options?.provider || getWhatsAppProvider();

  let sendResult: WhatsAppSendResult;

  try {
    sendResult = await provider.sendMessage({
      recipient: merchantPhone,
      notificationType: type,
      messageText,
      metadata: {
        caseId: ctx.caseId,
        orderId: ctx.orderId,
        amount: ctx.amount
      }
    });
  } catch (providerError: any) {
    console.error("Pahadi AI Notifications [provider exception caught]:", providerError?.message);
    sendResult = {
      success: false,
      provider: provider.name,
      mode: "live",
      recipient: merchantPhone,
      notificationType: type,
      error: providerError?.message || "Provider crashed",
      errorCategory: "PROVIDER_EXCEPTION",
      sentAt: now
    };
  }

  // 4. Audit Log to agent_actions table (Failure Isolated)
  if (ctx.caseDbId || ctx.caseId) {
    try {
      const actionType = sendResult.success
        ? "WHATSAPP_NOTIFICATION_SENT"
        : "WHATSAPP_NOTIFICATION_FAILED";

      const actionStatus = sendResult.success ? "EXECUTED" : "FAILED";

      await db.from("agent_actions").insert({
        case_id: ctx.caseDbId || null,
        action_type: actionType,
        channel: "WHATSAPP",
        status: actionStatus,
        action_payload: {
          notificationType: type,
          caseId: ctx.caseId,
          orderId: ctx.orderId,
          recipient: merchantPhone,
          provider: sendResult.provider,
          mode: sendResult.mode,
          messageId: sendResult.messageId || null,
          error: sendResult.error || null,
          errorCategory: sendResult.errorCategory || null
        },
        reasoning: sendResult.success
          ? `WhatsApp ${type} merchant notification sent via ${sendResult.provider} (${sendResult.mode}).`
          : `WhatsApp ${type} notification failed: ${sendResult.error || "Unknown error"}.`,
        executed_at: now,
        created_at: now
      });
    } catch (auditErr) {
      console.warn("Pahadi AI Notifications [audit log warning]:", auditErr);
    }
  }

  return sendResult;
}

// Convenience Helpers
export const notifyRecoveryOpportunity = (ctx: NotificationContext, options?: NotificationOptions) =>
  sendWhatsAppNotification("RECOVERY_OPPORTUNITY", ctx, options);

export const notifyRecoveryInitiated = (ctx: NotificationContext, options?: NotificationOptions) =>
  sendWhatsAppNotification("RECOVERY_INITIATED", ctx, options);

export const notifyPaymentRecovered = (ctx: NotificationContext, options?: NotificationOptions) =>
  sendWhatsAppNotification("PAYMENT_RECOVERED", ctx, options);

export const notifyRecoveryFailed = (ctx: NotificationContext, options?: NotificationOptions) =>
  sendWhatsAppNotification("RECOVERY_FAILED", ctx, options);

export const notifyDailySummary = (ctx: NotificationContext, options?: NotificationOptions) =>
  sendWhatsAppNotification("DAILY_SUMMARY", ctx, options);

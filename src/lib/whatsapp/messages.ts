/**
 * WhatsApp Message Templates and Formatting
 */

import {
  WhatsAppNotificationType,
  NotificationContext,
  WhatsAppApiPayload,
} from './types';
import { getWhatsAppConfig } from './config';

export function buildNotificationText(
  type: WhatsAppNotificationType,
  context: NotificationContext
): string {
  const amountStr = context.amount !== undefined ? `₹${context.amount.toFixed(2)}` : 'N/A';
  const orderId = context.orderId || 'N/A';
  const customerName = context.customerName || 'Customer';
  const reason = context.failureReason || 'Card / UPI declined';
  const link = context.paymentLink || 'N/A';
  const resolvedBy = context.resolvedBy || 'Razorpay Autonomous Webhook';

  switch (type) {
    case 'PAYMENT_FAILED':
      return [
        `⚠️ *Pahadi AI Alert: Payment Failed*`,
        `Order: \`${orderId}\``,
        `Customer: ${customerName}`,
        `Amount: *${amountStr}*`,
        `Reason: ${reason}`,
        `Status: Recovery evaluation underway by Autonomous Agent...`,
      ].join('\n');

    case 'RECOVERY_INITIATED':
      return [
        `🚀 *Pahadi AI: Recovery Initiated*`,
        `Order: \`${orderId}\``,
        `Customer: ${customerName}`,
        `Amount: *${amountStr}*`,
        `Recovery Link: ${link}`,
        `Status: Payment link generated and sent to customer.`,
      ].join('\n');

    case 'PAYMENT_RECOVERED':
      return [
        `🎉 *Pahadi AI Alert: Revenue Recovered!*`,
        `Order: \`${orderId}\``,
        `Amount: *${amountStr}*`,
        `Settled via: ${resolvedBy}`,
        `Inventory: Settled & Order marked PAID.`,
        `Revenue safely recovered by Pahadi AI Autonomous Agent! ✨`,
      ].join('\n');

    case 'RECOVERY_FAILED':
      return [
        `❌ *Pahadi AI Alert: Recovery Unsuccessful*`,
        `Order: \`${orderId}\``,
        `Amount: *${amountStr}*`,
        `Reason: ${reason}`,
        `Status: Manual merchant intervention recommended.`,
      ].join('\n');

    case 'TEST_ALERT':
      return [
        `🔔 *Pahadi AI: WhatsApp Integration Test*`,
        `Status: *CONNECTED*`,
        `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
        `System: Meta WhatsApp Cloud API is operational and verified.`,
      ].join('\n');

    default:
      return `📢 *Pahadi AI Update*\nOrder: \`${orderId}\`\nAmount: *${amountStr}*`;
  }
}

export function buildWhatsAppPayload(
  type: WhatsAppNotificationType,
  recipient: string,
  context: NotificationContext
): WhatsAppApiPayload {
  const config = getWhatsAppConfig();

  // If a Meta pre-approved template name is configured for this type, use template payload
  let templateName: string | undefined;
  switch (type) {
    case 'PAYMENT_FAILED':
      templateName = config.templatePaymentFailed;
      break;
    case 'RECOVERY_INITIATED':
      templateName = config.templateRecoveryInitiated;
      break;
    case 'PAYMENT_RECOVERED':
      templateName = config.templatePaymentRecovered;
      break;
    case 'RECOVERY_FAILED':
      templateName = config.templateRecoveryFailed;
      break;
  }

  if (templateName) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: context.orderId || 'N/A' },
              { type: 'text', text: context.amount !== undefined ? `₹${context.amount.toFixed(2)}` : 'N/A' },
              { type: 'text', text: context.customerName || 'Customer' },
            ],
          },
        ],
      },
    };
  }

  // Fallback to rich formatted text message (ideal for showcase / test merchant numbers)
  const bodyText = buildNotificationText(type, context);
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: {
      preview_url: Boolean(context.paymentLink),
      body: bodyText,
    },
  };
}

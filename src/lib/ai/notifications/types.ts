// src/lib/ai/notifications/types.ts

export type WhatsAppNotificationType =
  | "RECOVERY_OPPORTUNITY"
  | "RECOVERY_INITIATED"
  | "PAYMENT_RECOVERED"
  | "RECOVERY_FAILED"
  | "DAILY_SUMMARY";

export type WhatsAppProviderType = "meta" | "twilio" | "mock";

export interface WhatsAppMessagePayload {
  recipient: string;
  notificationType: WhatsAppNotificationType;
  messageText: string;
  templateName?: string;
  templateVariables?: Record<string, string | number>;
  metadata?: Record<string, any>;
}

export interface WhatsAppSendResult {
  success: boolean;
  provider: WhatsAppProviderType | string;
  mode: "live" | "mock";
  messageId?: string;
  recipient?: string;
  notificationType?: WhatsAppNotificationType;
  error?: string;
  errorCategory?: string;
  sentAt: string;
}

export interface WhatsAppProvider {
  name: WhatsAppProviderType | string;
  sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult>;
}

export interface NotificationContext {
  caseId?: string;
  caseDbId?: string;
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  amount?: number;
  currency?: string;
  recoveryProbability?: number;
  expectedRecovery?: number;
  action?: string;
  policyStatus?: string;
  recoveryUrl?: string;
  reason?: string;
  kpis?: {
    atRisk: number;
    recovered: number;
    rate: number;
    activeCases: number;
    successfulRecoveries: number;
  };
  metadata?: Record<string, any>;
}

export interface NotificationOptions {
  provider?: WhatsAppProvider;
  merchantPhone?: string;
  forceSend?: boolean;
  supabaseClient?: any;
}

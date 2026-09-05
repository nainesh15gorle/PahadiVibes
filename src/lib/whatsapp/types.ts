/**
 * WhatsApp Cloud API Integration Types
 */

export type WhatsAppNotificationType =
  | 'PAYMENT_FAILED'
  | 'RECOVERY_INITIATED'
  | 'PAYMENT_RECOVERED'
  | 'RECOVERY_FAILED'
  | 'TEST_ALERT';

export type WhatsAppMode = 'live' | 'mock';
export type WhatsAppProvider = 'meta' | 'mock';

export interface WhatsAppConfig {
  mode: WhatsAppMode;
  provider: WhatsAppProvider;
  phoneNumberId?: string;
  accessToken?: string;
  businessAccountId?: string;
  merchantNumber?: string;
  apiVersion: string;
  templatePaymentFailed?: string;
  templateRecoveryInitiated?: string;
  templatePaymentRecovered?: string;
  templateRecoveryFailed?: string;
}

export interface WhatsAppDiagnosticStatus {
  mode: WhatsAppMode;
  provider: WhatsAppProvider;
  configured: boolean;
  status: 'CONNECTED' | 'NOT CONFIGURED' | 'ERROR';
  details: {
    phoneNumberIdConfigured: boolean;
    tokenConfigured: boolean;
    merchantNumberConfigured: boolean;
    businessAccountIdConfigured: boolean;
    apiVersion: string;
    targetRecipientMasked?: string;
  };
  error?: string;
}

export interface WhatsAppTextMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: {
    preview_url?: boolean;
    body: string;
  };
}

export interface WhatsAppTemplateParameter {
  type: 'text';
  text: string;
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: string;
  index?: string;
  parameters: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplateMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: WhatsAppTemplateComponent[];
  };
}

export type WhatsAppApiPayload = WhatsAppTextMessagePayload | WhatsAppTemplateMessagePayload;

export interface WhatsAppSendSuccess {
  success: true;
  provider: 'meta' | 'mock';
  messageId: string;
  recipient: string;
  timestamp: string;
}

export interface WhatsAppSendError {
  success: false;
  provider: 'meta' | 'mock';
  error: string;
  recipient: string;
  timestamp: string;
  statusCode?: number;
}

export type WhatsAppSendResult = WhatsAppSendSuccess | WhatsAppSendError;

export interface NotificationContext {
  orderId?: string;
  caseId?: string;
  amount?: number;
  customerName?: string;
  failureReason?: string;
  paymentLink?: string;
  resolvedBy?: string;
  metadata?: Record<string, unknown>;
}

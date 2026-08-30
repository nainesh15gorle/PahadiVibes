// src/lib/ai/notifications/whatsapp.ts
import type {
  WhatsAppMessagePayload,
  WhatsAppProvider,
  WhatsAppSendResult,
  WhatsAppProviderType
} from "./types";

export interface ProviderConfig {
  mode?: "live" | "mock";
  providerType?: WhatsAppProviderType;
  phoneNumberId?: string;
  accessToken?: string;
  businessAccountId?: string;
  merchantNumber?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  fetcher?: typeof fetch;
}

/**
 * Mock WhatsApp Provider for local development, demo lab, and offline test runner.
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  name: WhatsAppProviderType = "mock";

  async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult> {
    const sentAt = new Date().toISOString();
    const cleanNumber = payload.recipient.replace(/[^0-9+]/g, "");
    const maskedNumber =
      cleanNumber.length > 5
        ? cleanNumber.slice(0, 3) + "XXXXXX" + cleanNumber.slice(-2)
        : cleanNumber;

    console.log("\n==================================================");
    console.log("[WHATSAPP MOCK NOTIFICATION]");
    console.log("To:", maskedNumber);
    console.log("Type:", payload.notificationType);
    console.log("--------------------------------------------------");
    console.log(payload.messageText);
    console.log("==================================================\n");

    const messageId = `wamid_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      success: true,
      provider: "mock",
      mode: "mock",
      messageId,
      recipient: payload.recipient,
      notificationType: payload.notificationType,
      sentAt
    };
  }
}

/**
 * Official Meta WhatsApp Cloud API Provider.
 *
 * Endpoint: POST https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages
 * Security: Server-side Bearer authentication; secrets are strictly masked.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  name: WhatsAppProviderType = "meta";
  private phoneNumberId: string;
  private accessToken: string;
  private fetchImpl: typeof fetch;

  constructor(config: { phoneNumberId: string; accessToken: string; fetcher?: typeof fetch }) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.fetchImpl = config.fetcher || fetch;
  }

  async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult> {
    const sentAt = new Date().toISOString();
    const cleanRecipient = payload.recipient.replace(/[^0-9]/g, "");

    if (!cleanRecipient) {
      return {
        success: false,
        provider: "meta",
        mode: "live",
        notificationType: payload.notificationType,
        error: "Invalid recipient phone number",
        errorCategory: "INVALID_RECIPIENT",
        sentAt
      };
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(this.phoneNumberId)}/messages`;

      const requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanRecipient,
        type: "text",
        text: {
          preview_url: false,
          body: payload.messageText
        }
      };

      const response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedError: any = {};
        try {
          parsedError = JSON.parse(errorText);
        } catch {
          parsedError = { message: errorText };
        }

        const safeErrorMessage =
          parsedError.error?.message ||
          parsedError.message ||
          `Meta API returned status ${response.status}`;

        return {
          success: false,
          provider: "meta",
          mode: "live",
          recipient: payload.recipient,
          notificationType: payload.notificationType,
          error: safeErrorMessage,
          errorCategory: parsedError.error?.type || "META_API_ERROR",
          sentAt
        };
      }

      const responseData = await response.json();
      const messageId = responseData.messages?.[0]?.id || `wamid_${Date.now()}`;

      return {
        success: true,
        provider: "meta",
        mode: "live",
        messageId,
        recipient: payload.recipient,
        notificationType: payload.notificationType,
        sentAt
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "meta",
        mode: "live",
        recipient: payload.recipient,
        notificationType: payload.notificationType,
        error: err?.message || "Network request failed",
        errorCategory: "NETWORK_ERROR",
        sentAt
      };
    }
  }
}

/**
 * Twilio WhatsApp Provider (Alternative supported channel).
 */
export class TwilioWhatsAppProvider implements WhatsAppProvider {
  name: WhatsAppProviderType = "twilio";
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private fetchImpl: typeof fetch;

  constructor(config: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    fetcher?: typeof fetch;
  }) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber.startsWith("whatsapp:")
      ? config.fromNumber
      : `whatsapp:${config.fromNumber}`;
    this.fetchImpl = config.fetcher || fetch;
  }

  async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult> {
    const sentAt = new Date().toISOString();
    const toFormatted = payload.recipient.startsWith("whatsapp:")
      ? payload.recipient
      : `whatsapp:${payload.recipient}`;

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
        this.accountSid
      )}/Messages.json`;

      const authString = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
      const formParams = new URLSearchParams();
      formParams.append("To", toFormatted);
      formParams.append("From", this.fromNumber);
      formParams.append("Body", payload.messageText);

      const response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${authString}`
        },
        body: formParams.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          provider: "twilio",
          mode: "live",
          recipient: payload.recipient,
          notificationType: payload.notificationType,
          error: `Twilio API error: status ${response.status}`,
          errorCategory: "TWILIO_API_ERROR",
          sentAt
        };
      }

      const responseData = await response.json();
      return {
        success: true,
        provider: "twilio",
        mode: "live",
        messageId: responseData.sid || `SM_${Date.now()}`,
        recipient: payload.recipient,
        notificationType: payload.notificationType,
        sentAt
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "twilio",
        mode: "live",
        recipient: payload.recipient,
        notificationType: payload.notificationType,
        error: err?.message || "Twilio request failed",
        errorCategory: "NETWORK_ERROR",
        sentAt
      };
    }
  }
}

/**
 * Resolves the active WhatsApp provider based on environment variables and options.
 */
export function getWhatsAppProvider(customConfig?: ProviderConfig): WhatsAppProvider {
  const mode = customConfig?.mode || process.env.WHATSAPP_MODE || "mock";
  const providerType = customConfig?.providerType || process.env.WHATSAPP_PROVIDER || "meta";

  if (mode === "mock") {
    return new MockWhatsAppProvider();
  }

  if (providerType === "meta") {
    const phoneNumberId = customConfig?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = customConfig?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      // Graceful fallback to Mock provider if live secrets not configured
      return new MockWhatsAppProvider();
    }

    return new MetaWhatsAppProvider({
      phoneNumberId,
      accessToken,
      fetcher: customConfig?.fetcher
    });
  }

  if (providerType === "twilio") {
    const accountSid = customConfig?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = customConfig?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
    const fromNumber =
      customConfig?.twilioFromNumber || process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886";

    if (!accountSid || !authToken) {
      return new MockWhatsAppProvider();
    }

    return new TwilioWhatsAppProvider({
      accountSid,
      authToken,
      fromNumber,
      fetcher: customConfig?.fetcher
    });
  }

  return new MockWhatsAppProvider();
}

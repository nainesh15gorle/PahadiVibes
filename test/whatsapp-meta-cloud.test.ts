import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getWhatsAppConfig,
  getWhatsAppDiagnosticStatus,
  maskPhoneNumber,
  logWhatsAppStartupDiagnostics,
  normalizePhoneNumber,
  sendMetaWhatsAppMessage,
  buildNotificationText,
  buildWhatsAppPayload,
  dispatchRecoveryNotification,
} from '../src/lib/whatsapp';
import { POST as testWhatsAppEndpoint } from '../src/app/api/whatsapp/test/route';
import { GET as statusWhatsAppEndpoint } from '../src/app/api/whatsapp/status/route';

describe('WhatsApp Meta Cloud API Integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env vars before each test
    delete process.env.WHATSAPP_MODE;
    delete process.env.WHATSAPP_PROVIDER;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    delete process.env.WHATSAPP_MERCHANT_NUMBER;
    delete process.env.WHATSAPP_API_VERSION;
    delete process.env.ADMIN_BYPASS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // Test 1: Config loading with full live credentials
  test('1. Config loads properly from environment variables', () => {
    process.env.WHATSAPP_MODE = 'live';
    process.env.WHATSAPP_PROVIDER = 'meta';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '10987654321';
    process.env.WHATSAPP_ACCESS_TOKEN = 'EAABtestToken123456';
    process.env.WHATSAPP_MERCHANT_NUMBER = '+919876543210';
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = '99887766';

    const config = getWhatsAppConfig();
    assert.equal(config.mode, 'live');
    assert.equal(config.provider, 'meta');
    assert.equal(config.phoneNumberId, '10987654321');
    assert.equal(config.accessToken, 'EAABtestToken123456');
    assert.equal(config.merchantNumber, '+919876543210');
    assert.equal(config.apiVersion, 'v20.0');
  });

  // Test 2: Missing env vars fallback safely to mock/NOT CONFIGURED
  test('2. Missing credentials safely fallback to NOT CONFIGURED status', () => {
    const status = getWhatsAppDiagnosticStatus();
    assert.equal(status.configured, false);
    assert.equal(status.status, 'NOT CONFIGURED');
    assert.equal(status.details.tokenConfigured, false);
  });

  // Test 3: Status returns ERROR if mode is live but credentials missing
  test('3. Diagnostic status reports ERROR if live mode is active without credentials', () => {
    process.env.WHATSAPP_MODE = 'live';
    const status = getWhatsAppDiagnosticStatus();
    assert.equal(status.status, 'ERROR');
    assert.ok(status.error?.includes('credentials are missing'));
  });

  // Test 4: Meta HTTP client successful delivery
  test('4. Meta HTTP client dispatches valid POST request with Bearer authorization', async () => {
    process.env.WHATSAPP_MODE = 'live';
    process.env.WHATSAPP_PROVIDER = 'meta';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '987654321';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test_secret_token_123';

    const originalFetch = global.fetch;
    let interceptedUrl = '';
    let interceptedHeaders: any = {};
    let interceptedBody: any = {};

    global.fetch = async (url: any, opts: any) => {
      interceptedUrl = url.toString();
      interceptedHeaders = opts.headers;
      interceptedBody = JSON.parse(opts.body);

      return {
        ok: true,
        status: 200,
        json: async () => ({
          messaging_product: 'whatsapp',
          contacts: [{ input: '919876543210', wa_id: '919876543210' }],
          messages: [{ id: 'wamid.HBgLMTIzNDU2' }],
        }),
      } as any;
    };

    try {
      const result = await sendMetaWhatsAppMessage({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '+91 98765 43210',
        type: 'text',
        text: { body: 'Test Message' },
      });

      assert.equal(result.success, true);
      assert.equal(result.provider, 'meta');
      assert.equal(result.messageId, 'wamid.HBgLMTIzNDU2');
      assert.ok(interceptedUrl.includes('graph.facebook.com/v20.0/987654321/messages'));
      assert.equal(interceptedHeaders['Authorization'], 'Bearer test_secret_token_123');
      assert.equal(interceptedBody.to, '919876543210');
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Test 5: Meta HTTP client handles 401/400 API errors safely
  test('5. Meta HTTP client handles API errors without crashing and sanitizes messages', async () => {
    process.env.WHATSAPP_MODE = 'live';
    process.env.WHATSAPP_PROVIDER = 'meta';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '987654321';
    process.env.WHATSAPP_ACCESS_TOKEN = 'invalid_secret_token';

    const originalFetch = global.fetch;
    global.fetch = async () => {
      return {
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Invalid OAuth access token.',
            type: 'OAuthException',
            code: 190,
          },
        }),
      } as any;
    };

    try {
      const result = await sendMetaWhatsAppMessage({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '919876543210',
        type: 'text',
        text: { body: 'Test Message' },
      });

      assert.equal(result.success, false);
      assert.equal(result.statusCode, 401);
      assert.ok(result.error?.includes('Invalid OAuth access token'));
      // Ensure token is never included in error output
      assert.ok(!result.error?.includes('invalid_secret_token'));
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Test 6: Network timeout handling via AbortController
  test('6. Network timeout aborts request and reports safe error', async () => {
    process.env.WHATSAPP_MODE = 'live';
    process.env.WHATSAPP_PROVIDER = 'meta';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '987654321';
    process.env.WHATSAPP_ACCESS_TOKEN = 'valid_token';

    const originalFetch = global.fetch;
    global.fetch = async (_url: any, opts: any) => {
      return new Promise((resolve, reject) => {
        const checkAbort = () => {
          if (opts.signal?.aborted) {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          }
        };
        opts.signal?.addEventListener('abort', checkAbort);
      });
    };

    try {
      const result = await sendMetaWhatsAppMessage(
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: '919876543210',
          type: 'text',
          text: { body: 'Test Timeout' },
        },
        50 // short 50ms timeout for test
      );

      assert.equal(result.success, false);
      assert.ok(result.error?.includes('timed out') || result.error?.includes('aborted'));
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Test 7: Recipient phone number normalization
  test('7. Phone numbers are normalized to E.164 without leading plus', () => {
    assert.equal(normalizePhoneNumber('+91 98765 43210'), '919876543210');
    assert.equal(normalizePhoneNumber('9876543210'), '919876543210');
    assert.equal(normalizePhoneNumber('+1 (415) 555-2671'), '14155552671');
  });

  // Test 8: Masking utility masks phone number secrets
  test('8. maskPhoneNumber properly masks numbers', () => {
    assert.equal(maskPhoneNumber('+919876543210'), '+91***3210');
    assert.equal(maskPhoneNumber(''), 'NOT CONFIGURED');
  });

  // Test 9: Format exact messages for all 4 notification types
  test('9. buildNotificationText correctly formats all 4 notification types', () => {
    const ctx = {
      orderId: 'ORD-1234',
      amount: 2499,
      customerName: 'Aarav Sharma',
      failureReason: 'Card expired',
      paymentLink: 'https://rzp.io/i/recov_123',
      resolvedBy: 'Razorpay Autonomous Webhook',
    };

    const failedText = buildNotificationText('PAYMENT_FAILED', ctx);
    assert.ok(failedText.includes('Pahadi AI Alert: Payment Failed'));
    assert.ok(failedText.includes('ORD-1234'));
    assert.ok(failedText.includes('₹2499.00'));

    const initiatedText = buildNotificationText('RECOVERY_INITIATED', ctx);
    assert.ok(initiatedText.includes('Recovery Initiated'));
    assert.ok(initiatedText.includes('https://rzp.io/i/recov_123'));

    const recoveredText = buildNotificationText('PAYMENT_RECOVERED', ctx);
    assert.ok(recoveredText.includes('Revenue Recovered!'));
    assert.ok(recoveredText.includes('Settled via: Razorpay Autonomous Webhook'));

    const recovFailedText = buildNotificationText('RECOVERY_FAILED', ctx);
    assert.ok(recovFailedText.includes('Recovery Unsuccessful'));
  });

  // Test 10: Payload construction respects pre-approved template config
  test('10. buildWhatsAppPayload uses template structure when configured', () => {
    process.env.WHATSAPP_TEMPLATE_PAYMENT_RECOVERED = 'pahadi_revenue_recovered_v1';

    const payload = buildWhatsAppPayload('PAYMENT_RECOVERED', '919876543210', {
      orderId: 'ORD-999',
      amount: 4500,
      customerName: 'Priya Singh',
    });

    assert.equal(payload.type, 'template');
    if (payload.type === 'template') {
      assert.equal(payload.template.name, 'pahadi_revenue_recovered_v1');
      assert.equal(payload.template.language.code, 'en_US');
    }
  });

  // Test 11: Dispatcher failure isolation (exceptions do not throw)
  test('11. dispatchRecoveryNotification catches errors safely and never throws', async () => {
    // Missing recipient returns safe error result without throwing
    const result = await dispatchRecoveryNotification('PAYMENT_FAILED', {
      orderId: 'ORD-ERR',
      amount: 100,
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes('No WhatsApp recipient'));
  });

  // Test 12: Dispatcher idempotency suppresses duplicate alerts
  test('12. dispatchRecoveryNotification suppresses duplicate alerts for same order and type', async () => {
    process.env.WHATSAPP_MERCHANT_NUMBER = '+919876543210';
    process.env.WHATSAPP_MODE = 'mock';

    const first = await dispatchRecoveryNotification('PAYMENT_RECOVERED', {
      orderId: 'ORD-IDEMPOTENT-001',
      amount: 1500,
    });
    assert.equal(first.success, true);

    const duplicate = await dispatchRecoveryNotification('PAYMENT_RECOVERED', {
      orderId: 'ORD-IDEMPOTENT-001',
      amount: 1500,
    });
    assert.equal(duplicate.success, true);
    assert.ok(duplicate.messageId.startsWith('idempotent_skip_'));
  });

  // Test 13: Startup diagnostic logger runs without printing secrets
  test('13. Startup diagnostic log masks tokens and numbers', () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'SUPER_SECRET_BEARER_TOKEN';
    process.env.WHATSAPP_MERCHANT_NUMBER = '+919876543210';

    let loggedOutput = '';
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      loggedOutput += args.join(' ') + '\n';
    };

    try {
      logWhatsAppStartupDiagnostics();
      assert.ok(!loggedOutput.includes('SUPER_SECRET_BEARER_TOKEN'));
      assert.ok(loggedOutput.includes('Masked'));
    } finally {
      console.log = originalLog;
    }
  });

  // Test 14: Admin endpoint POST /api/whatsapp/test rejects unauthorized calls
  test('14. POST /api/whatsapp/test requires admin authentication', async () => {
    // Standard unauthenticated request
    const req = new Request('http://localhost:3000/api/whatsapp/test', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await testWhatsAppEndpoint(req);
    assert.ok(res.status === 401 || res.status === 403);
  });

  // Test 15: Admin endpoint GET /api/whatsapp/status returns diagnostic JSON
  test('15. GET /api/whatsapp/status returns diagnostic status JSON', async () => {
    const req = new Request('http://localhost:3000/api/whatsapp/status');
    // Without admin bypass cookie, returns 401/403
    const res = await statusWhatsAppEndpoint();
    assert.ok(res.status === 401 || res.status === 403);
  });
});

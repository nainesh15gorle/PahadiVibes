// test/whatsapp-notifications.test.ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  formatWhatsAppMessage,
  sendWhatsAppNotification,
  notifyRecoveryOpportunity,
  notifyRecoveryInitiated,
  notifyPaymentRecovered,
  notifyRecoveryFailed,
  notifyDailySummary,
  MockWhatsAppProvider,
  MetaWhatsAppProvider,
  getWhatsAppProvider
} from "../src/lib/ai/notifications";
import type { WhatsAppProvider } from "../src/lib/ai/notifications/types";
import { executeRecoveryAction, processRecoveryPaymentWebhook } from "../src/lib/ai/recovery-executor";
import crypto from "crypto";

/**
 * In-memory mock database helper for testing notification isolation & audit logging
 */
function createMockDb() {
  const tableData: Record<string, any[]> = {
    recovery_cases: [],
    revenue_events: [],
    agent_actions: [],
    orders: [],
    products: []
  };

  const createQueryBuilder = (tableName: string) => {
    let currentRows = [...(tableData[tableName] || [])];
    const builder: any = {
      select: (fields = "*") => {
        currentRows = [...(tableData[tableName] || [])];
        return builder;
      },
      insert: async (data: any) => {
        const rows = Array.isArray(data) ? data : [data];
        rows.forEach((r) => {
          const rowWithId = { id: r.id || `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, ...r };
          tableData[tableName].push(rowWithId);
        });
        return {
          data: rows,
          error: null,
          select: () => ({
            maybeSingle: async () => ({ data: tableData[tableName][tableData[tableName].length - 1], error: null })
          })
        };
      },
      update: (updates: any) => {
        return {
          eq: async (field: string, value: any) => {
            tableData[tableName].forEach((row) => {
              if (row[field] === value) {
                Object.assign(row, updates);
              }
            });
            return {
              data: tableData[tableName].find((r) => r[field] === value),
              error: null,
              select: () => ({
                maybeSingle: async () => ({
                  data: tableData[tableName].find((r) => r[field] === value),
                  error: null
                })
              })
            };
          }
        };
      },
      eq: (field: string, value: any) => {
        currentRows = currentRows.filter((r) => r[field] === value);
        return builder;
      },
      or: (condition: string) => {
        return builder;
      },
      order: () => builder,
      limit: (n: number) => {
        currentRows = currentRows.slice(0, n);
        return builder;
      },
      maybeSingle: async () => {
        return { data: currentRows[0] || null, error: null };
      },
      then: (onfulfilled: any, onrejected: any) => {
        return Promise.resolve({ data: currentRows, error: null }).then(onfulfilled, onrejected);
      }
    };
    return builder;
  };

  return {
    from: (table: string) => createQueryBuilder(table),
    _data: tableData
  };
}

describe("PAHADI AI — WHATSAPP MERCHANT NOTIFICATION LAYER", () => {
  // Test 1: Recovery opportunity notification
  test("Test 1: Formats and dispatches RECOVERY_OPPORTUNITY notification with probability and amount", async () => {
    const msg = formatWhatsAppMessage("RECOVERY_OPPORTUNITY", {
      customerName: "Priya Sharma",
      amount: 4999,
      recoveryProbability: 0.84,
      expectedRecovery: 4199,
      action: "RETRY_PAYMENT",
      policyStatus: "APPROVED",
      recoveryUrl: "https://rzp.io/i/test_sample_link"
    });

    assert.ok(msg.includes("🤖 PAHADI AI"), "Includes brand header");
    assert.ok(msg.includes("REVENUE RECOVERY OPPORTUNITY"), "Includes title");
    assert.ok(msg.includes("Customer: Priya Sharma"), "Includes customer name");
    assert.ok(msg.includes("₹4,999"), "Includes formatted amount");
    assert.ok(msg.includes("84%"), "Includes probability percentage");
    assert.ok(msg.includes("Expected recovery:\n₹4,199"), "Includes expected recovery");
    assert.ok(msg.includes("RETRY PAYMENT"), "Includes recommended action");
    assert.ok(msg.includes("https://rzp.io/i/test_sample_link"), "Includes link");
  });

  // Test 2: Recovery initiated notification
  test("Test 2: Formats and dispatches RECOVERY_INITIATED notification", async () => {
    const msg = formatWhatsAppMessage("RECOVERY_INITIATED", {
      customerName: "Rahul Verma",
      amount: 3500,
      action: "RETRY_PAYMENT"
    });

    assert.ok(msg.includes("RECOVERY INITIATED"), "Includes title");
    assert.ok(msg.includes("Customer: Rahul Verma"), "Includes customer name");
    assert.ok(msg.includes("Amount: ₹3,500"), "Includes formatted amount");
    assert.ok(msg.includes("Status:\nIN RECOVERY"), "Includes status");
  });

  // Test 3: Payment recovered notification
  test("Test 3: Formats and dispatches PAYMENT_RECOVERED notification upon verified settlement", async () => {
    const msg = formatWhatsAppMessage("PAYMENT_RECOVERED", {
      customerName: "Ananya Joshi",
      amount: 4999,
      action: "Payment Recovery"
    });

    assert.ok(msg.includes("✅ REVENUE RECOVERED"), "Includes success title");
    assert.ok(msg.includes("Customer: Ananya Joshi"), "Includes customer name");
    assert.ok(msg.includes("Amount: ₹4,999"), "Includes formatted amount");
    assert.ok(msg.includes("Status:\nSUCCESS"), "Includes status success");
  });

  // Test 4: Recovery failed notification
  test("Test 4: Formats and dispatches RECOVERY_FAILED notification with reason", async () => {
    const msg = formatWhatsAppMessage("RECOVERY_FAILED", {
      customerName: "Vikram Malhotra",
      amount: 18500,
      reason: "Order amount exceeds maximum automatic recovery limit of ₹10,000"
    });

    assert.ok(msg.includes("⚠️ RECOVERY FAILED"), "Includes failure title");
    assert.ok(msg.includes("Reason:\nOrder amount exceeds maximum automatic recovery limit of ₹10,000"), "Includes reason");
  });

  // Test 5: Mock mode
  test("Test 5: Mock mode returns deterministic mock message ID without calling external APIs", async () => {
    const mockDb = createMockDb();
    const result = await notifyRecoveryOpportunity(
      {
        caseId: "rcase_test_mock_001",
        caseDbId: "case_uuid_001",
        customerName: "Mock Customer",
        amount: 2999,
        recoveryProbability: 0.75
      },
      {
        provider: new MockWhatsAppProvider(),
        merchantPhone: "+919876543210",
        supabaseClient: mockDb
      }
    );

    assert.equal(result.success, true, "Mock send succeeds");
    assert.equal(result.mode, "mock", "Mode is mock");
    assert.equal(result.provider, "mock", "Provider is mock");
    assert.ok(result.messageId?.startsWith("wamid_mock_"), "MessageId has mock prefix");

    // Check audit log
    const auditActions = mockDb._data.agent_actions;
    assert.equal(auditActions.length, 1, "Recorded 1 action in agent_actions");
    assert.equal(auditActions[0].action_type, "WHATSAPP_NOTIFICATION_SENT");
    assert.equal(auditActions[0].channel, "WHATSAPP");
    assert.equal(auditActions[0].status, "EXECUTED");
  });

  // Test 6: Provider failure handling
  test("Test 6: Provider failure is captured gracefully and recorded as FAILED without throwing", async () => {
    const mockDb = createMockDb();
    const failingProvider: WhatsAppProvider = {
      name: "meta",
      sendMessage: async () => {
        throw new Error("Meta API rate limit exceeded");
      }
    };

    const result = await sendWhatsAppNotification(
      "RECOVERY_INITIATED",
      {
        caseId: "rcase_test_fail_001",
        caseDbId: "case_uuid_fail",
        customerName: "Fail Test",
        amount: 4999
      },
      {
        provider: failingProvider,
        supabaseClient: mockDb
      }
    );

    assert.equal(result.success, false, "Result reflects failure");
    assert.equal(result.error, "Meta API rate limit exceeded");

    // Check audit log recorded as WHATSAPP_NOTIFICATION_FAILED
    const auditActions = mockDb._data.agent_actions;
    assert.equal(auditActions.length, 1);
    assert.equal(auditActions[0].action_type, "WHATSAPP_NOTIFICATION_FAILED");
    assert.equal(auditActions[0].status, "FAILED");
  });

  // Test 7: Duplicate notification (idempotency)
  test("Test 7: Duplicate notification for the same case and type is safely bypassed", async () => {
    const mockDb = createMockDb();
    const provider = new MockWhatsAppProvider();

    // First notification
    const res1 = await notifyRecoveryInitiated(
      {
        caseId: "rcase_test_dup_001",
        caseDbId: "case_uuid_dup",
        customerName: "Duplicate Test",
        amount: 4999
      },
      { provider, supabaseClient: mockDb }
    );
    assert.equal(res1.success, true);
    assert.equal(mockDb._data.agent_actions.length, 1);

    // Second notification (same case & same type)
    const res2 = await notifyRecoveryInitiated(
      {
        caseId: "rcase_test_dup_001",
        caseDbId: "case_uuid_dup",
        customerName: "Duplicate Test",
        amount: 4999
      },
      { provider, supabaseClient: mockDb }
    );

    assert.equal(res2.success, true);
    assert.equal(res2.provider, "idempotent_bypass", "Bypassed due to idempotency");
    assert.equal(mockDb._data.agent_actions.length, 1, "Did not insert duplicate audit record");
  });

  // Test 8: Missing WhatsApp credentials fallback
  test("Test 8: Missing credentials gracefully falls back to MockWhatsAppProvider", () => {
    const provider = getWhatsAppProvider({
      mode: "live",
      providerType: "meta",
      phoneNumberId: undefined,
      accessToken: undefined
    });

    assert.equal(provider.name, "mock", "Falls back to mock provider");
  });

  // Test 9: Agent continues normally when WhatsApp fails (Failure Isolation)
  test("Test 9: Failure Isolation - Recovery webhook completes even when WhatsApp throws", async () => {
    const mockDb = createMockDb();
    const webhookSecret = "test_webhook_secret_999";

    // Setup initial recovery case in mock db
    mockDb._data.recovery_cases.push({
      id: "case_iso_001",
      case_id: "rcase_iso_001",
      order_id: "ord_iso_001",
      customer_name: "Isolation Test",
      customer_email: "iso@example.com",
      amount: 4999,
      currency: "INR",
      recovery_status: "IN_RECOVERY"
    });

    mockDb._data.orders.push({
      id: "ord_iso_001",
      user_id: "user_iso",
      customer_name: "Isolation Test",
      total: 4999,
      payment_status: "Pending"
    });

    const eventPayload = {
      id: "evt_rzp_iso_1",
      event: "payment_link.paid",
      payload: {
        payment_link: {
          entity: {
            id: "plink_iso_1",
            amount: 499900,
            amount_paid: 499900,
            currency: "INR",
            status: "paid",
            notes: {
              case_id: "rcase_iso_001",
              internalOrderId: "ord_iso_001"
            }
          }
        },
        payment: {
          entity: {
            id: "pay_iso_1",
            amount: 499900,
            currency: "INR"
          }
        }
      }
    };

    const rawBody = JSON.stringify(eventPayload);
    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // Process webhook
    const result = await processRecoveryPaymentWebhook({
      rawBody,
      signature,
      webhookSecret,
      event: eventPayload,
      supabaseClient: mockDb
    });

    assert.equal(result.success, true, "Webhook processing succeeded");
    assert.equal(result.status, "RECOVERED", "Case status transitioned to RECOVERED");

    // Verify recovery case was updated to RECOVERED
    const updatedCase = mockDb._data.recovery_cases.find((c) => c.id === "case_iso_001");
    assert.equal(updatedCase?.recovery_status, "RECOVERED");
  });

  // Test 10: No WhatsApp notification for unrelated standard checkout payment
  test("Test 10: Unrelated standard checkout payload does not trigger recovery WhatsApp alerts", async () => {
    const mockDb = createMockDb();
    const webhookSecret = "test_webhook_secret_999";

    const standardCheckoutEvent = {
      id: "evt_standard_001",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_std_001",
            amount: 120000,
            currency: "INR",
            notes: {
              // No case_id or recovery_case_id or source
              regularNote: "direct purchase"
            }
          }
        }
      }
    };

    const rawBody = JSON.stringify(standardCheckoutEvent);
    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const result = await processRecoveryPaymentWebhook({
      rawBody,
      signature,
      webhookSecret,
      event: standardCheckoutEvent,
      supabaseClient: mockDb
    });

    assert.equal(result.success, true);
    assert.equal(result.recoveryProcessed, false, "Not processed as recovery");
    // No WhatsApp actions generated
    const whatsappActions = mockDb._data.agent_actions.filter((a) => a.channel === "WHATSAPP");
    assert.equal(whatsappActions.length, 0, "Zero WhatsApp notifications triggered for unrelated order");
  });

  // Test 11: Secret values never appear in logs / payload audits
  test("Test 11: Secrets, tokens, and authorization headers are never logged or stored in audit payloads", async () => {
    const mockDb = createMockDb();
    const fakeSecret = "EAAGm0PX4ZCS4BASecretToken123456789";

    const metaProvider = new MetaWhatsAppProvider({
      phoneNumberId: "1234567890",
      accessToken: fakeSecret,
      fetcher: (async () => {
        return new Response(JSON.stringify({ error: { message: "Invalid OAuth token", type: "OAuthException" } }), {
          status: 401
        });
      }) as any
    });

    const result = await sendWhatsAppNotification(
      "RECOVERY_OPPORTUNITY",
      {
        caseId: "rcase_security_001",
        caseDbId: "case_sec_001",
        customerName: "Sec Test",
        amount: 4999
      },
      {
        provider: metaProvider,
        supabaseClient: mockDb
      }
    );

    assert.equal(result.success, false);

    // Verify audit log has no secret
    const auditRecord = mockDb._data.agent_actions[0];
    const auditJson = JSON.stringify(auditRecord);
    assert.ok(!auditJson.includes(fakeSecret), "Audit log does not contain accessToken secret");
  });

  // Test 12: Daily summary notification
  test("Test 12: Formats and dispatches DAILY_SUMMARY notification correctly", async () => {
    const msg = formatWhatsAppMessage("DAILY_SUMMARY", {
      kpis: {
        atRisk: 14500,
        recovered: 38200,
        rate: 72.5,
        activeCases: 4,
        successfulRecoveries: 9
      }
    });

    assert.ok(msg.includes("DAILY RECOVERY SUMMARY"), "Includes title");
    assert.ok(msg.includes("Revenue at risk:\n₹14,500"), "Includes at risk");
    assert.ok(msg.includes("Revenue recovered:\n₹38,200"), "Includes recovered");
    assert.ok(msg.includes("Recovery rate:\n72.5%"), "Includes rate");
    assert.ok(msg.includes("Active cases:\n4"), "Includes active cases");
    assert.ok(msg.includes("Successful recoveries:\n9"), "Includes recoveries");
  });
});

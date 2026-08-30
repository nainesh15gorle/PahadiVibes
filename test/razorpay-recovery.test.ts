// test/razorpay-recovery.test.ts
import { describe, it } from "node:test";
import assert from "node:assert";
import crypto from "crypto";
import type {
  DbRecoveryCase,
  DbRevenueEvent,
  PolicyEvaluationResult
} from "../src/lib/ai/types";
import {
  createRazorpayPaymentLink,
  executeRecoveryAction,
  processRecoveryPaymentWebhook
} from "../src/lib/ai/recovery-executor";
import { DEFAULT_RECOVERY_POLICY } from "../src/lib/ai/policy-engine";

describe("PAHADI AI — REAL RAZORPAY RECOVERY WORKFLOW", () => {
  const mockWebhookSecret = "test_webhook_secret_pahadi_ai_2026";

  // Helper to create valid HMAC SHA256 signature for test webhooks
  function createTestSignature(body: string, secret: string = mockWebhookSecret): string {
    return crypto.createHmac("sha256", secret).update(body).digest("hex");
  }

  // =========================================================================
  // Test 1: Payment Link Creation (RETRY_PAYMENT with Razorpay API integration)
  // =========================================================================
  it("Test 1: Creates compliant Razorpay Payment Link with order/case source of truth", async () => {
    const mockCase: DbRecoveryCase = {
      id: "case-uuid-rzp-001",
      case_id: "rcase_rzp_001",
      order_id: "test-order-001",
      razorpay_order_id: "order_rzp_001",
      customer_id: "test-customer-001",
      customer_name: "Test Customer",
      customer_email: "test.customer@pahadivibes.com",
      customer_phone: "+919876543210",
      amount: 4999,
      currency: "INR",
      stage: "PAYMENT_FAILED",
      recovery_status: "OPEN",
      failure_reason: "Bank timeout",
      last_event_id: "evt_001",
      cart_items: [{ productId: "p1", productName: "Aipan Art", quantity: 1, price: 4999 }],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: null
    };

    const approvedPolicy: PolicyEvaluationResult = {
      allowed: true,
      reason: "All recovery policies satisfied.",
      policyConfig: DEFAULT_RECOVERY_POLICY
    };

    // Custom mock fetcher simulating Razorpay API endpoint
    let capturedPayload: any = null;
    const mockFetcher: typeof fetch = async (url, init) => {
      capturedPayload = JSON.parse(init?.body as string);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "plink_test_123456",
          short_url: "https://rzp.io/i/test_123456",
          status: "created",
          amount: capturedPayload.amount,
          currency: capturedPayload.currency,
          expire_by: Math.floor(Date.now() / 1000) + 86400
        }),
        text: async () => ""
      } as any;
    };

    const result = await executeRecoveryAction(
      {
        recoveryCase: mockCase,
        decision: {
          action: "RETRY_PAYMENT",
          priority: "HIGH",
          expectedRecovery: 4199.16,
          reason: "Approved retry"
        },
        policy: approvedPolicy
      },
      {
        keyId: "rzp_test_dummy_key",
        keySecret: "rzp_test_dummy_secret",
        fetcher: mockFetcher
      }
    );

    // Verify execution status is INITIATED (never claims PAYMENT_RECOVERED at link creation)
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, "INITIATED");
    assert.strictEqual(result.actionType, "RETRY_PAYMENT");
    assert.strictEqual(result.paymentLink?.id, "plink_test_123456");
    assert.strictEqual(result.paymentLink?.shortUrl, "https://rzp.io/i/test_123456");
    assert.strictEqual(result.paymentLink?.amount, 4999);
    assert.strictEqual(result.paymentLink?.currency, "INR");

    // Verify that client cannot tamper with financial amount (derived from backend case in paise)
    assert.strictEqual(capturedPayload.amount, 499900);
    assert.strictEqual(capturedPayload.currency, "INR");
    assert.strictEqual(capturedPayload.notes.case_id, "rcase_rzp_001");
    assert.strictEqual(capturedPayload.notes.internalOrderId, "test-order-001");
  });

  // =========================================================================
  // Test 2: Policy-Blocked Recovery
  // =========================================================================
  it("Test 2: Policy-blocked action is skipped without calling Razorpay API", async () => {
    const mockCase: DbRecoveryCase = {
      id: "case-uuid-rzp-002",
      case_id: "rcase_rzp_002",
      order_id: "test-order-002",
      razorpay_order_id: null,
      customer_id: "test-customer-002",
      customer_name: "Test Customer 2",
      customer_email: "test2@example.com",
      customer_phone: null,
      amount: 4999,
      currency: "INR",
      stage: "PAYMENT_FAILED",
      recovery_status: "OPEN",
      failure_reason: "Limit reached",
      last_event_id: null,
      cart_items: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: null
    };

    const blockedPolicy: PolicyEvaluationResult = {
      allowed: false,
      reason: "Maximum retry attempts reached.",
      violatedPolicy: "MAX_RETRIES_EXCEEDED",
      policyConfig: DEFAULT_RECOVERY_POLICY
    };

    let fetcherCalled = false;
    const mockFetcher: typeof fetch = async () => {
      fetcherCalled = true;
      return {} as any;
    };

    const result = await executeRecoveryAction(
      {
        recoveryCase: mockCase,
        decision: {
          action: "RETRY_PAYMENT",
          priority: "LOW",
          expectedRecovery: 0,
          reason: "Blocked"
        },
        policy: blockedPolicy
      },
      { fetcher: mockFetcher }
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, "SKIPPED");
    assert.strictEqual(result.error, "Maximum retry attempts reached.");
    assert.strictEqual(fetcherCalled, false, "Must not invoke external API when policy blocks action");
  });

  // =========================================================================
  // Test 3: Already Recovered Case (Prevents duplicate execution)
  // =========================================================================
  it("Test 3: Case marked RECOVERED is skipped to prevent duplicate recovery requests", async () => {
    const alreadyRecoveredCase: DbRecoveryCase = {
      id: "case-uuid-rzp-003",
      case_id: "rcase_rzp_003",
      order_id: "test-order-003",
      razorpay_order_id: "rzp_paid_123",
      customer_id: "test-customer-003",
      customer_name: "Test Customer 3",
      customer_email: "test3@example.com",
      customer_phone: null,
      amount: 4999,
      currency: "INR",
      stage: "CHECKOUT_INITIATED",
      recovery_status: "RECOVERED",
      failure_reason: null,
      last_event_id: null,
      cart_items: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: new Date().toISOString()
    };

    const result = await executeRecoveryAction({
      recoveryCase: alreadyRecoveredCase,
      decision: {
        action: "RETRY_PAYMENT",
        priority: "HIGH",
        expectedRecovery: 4199.16,
        reason: "Retry"
      },
      policy: {
        allowed: true,
        reason: "Allowed",
        policyConfig: DEFAULT_RECOVERY_POLICY
      }
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, "SKIPPED");
    assert.ok(result.error?.includes("already recovered"));
  });

  // =========================================================================
  // Test 4: Duplicate Recovery Attempt / Repeated Execution Safety
  // =========================================================================
  it("Test 4: Repeated recovery execution handles duplicate requests safely", async () => {
    const mockCase: DbRecoveryCase = {
      id: "case-uuid-rzp-004",
      case_id: "rcase_rzp_004",
      order_id: "test-order-004",
      razorpay_order_id: null,
      customer_id: "test-customer-004",
      customer_name: "Test Customer 4",
      customer_email: "test4@example.com",
      customer_phone: null,
      amount: 4999,
      currency: "INR",
      stage: "PAYMENT_FAILED",
      recovery_status: "IN_RECOVERY",
      failure_reason: null,
      last_event_id: null,
      cart_items: [],
      metadata: { paymentLink: { id: "plink_existing_123" } },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: null
    };

    const mockFetcher: typeof fetch = async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "plink_existing_123",
          short_url: "https://rzp.io/i/existing_123",
          status: "created",
          amount: 499900,
          currency: "INR"
        })
      } as any;
    };

    const result = await executeRecoveryAction(
      {
        recoveryCase: mockCase,
        decision: {
          action: "RETRY_PAYMENT",
          priority: "HIGH",
          expectedRecovery: 4199.16,
          reason: "Retry"
        },
        policy: {
          allowed: true,
          reason: "Allowed",
          policyConfig: DEFAULT_RECOVERY_POLICY
        }
      },
      {
        keyId: "test_key",
        keySecret: "test_secret",
        fetcher: mockFetcher
      }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, "INITIATED");
    assert.strictEqual(result.paymentLink?.id, "plink_existing_123");
  });

  // =========================================================================
  // Test 5: Successful Recovery Webhook Handshake & Verification
  // =========================================================================
  it("Test 5: Webhook verifies cryptographic signature and transitions case to RECOVERED", async () => {
    // In-memory mock database for isolated verification
    let storedCase: DbRecoveryCase = {
      id: "case-uuid-rzp-005",
      case_id: "rcase_rzp_005",
      order_id: "test-order-005",
      razorpay_order_id: "order_rzp_005",
      customer_id: "test-customer-005",
      customer_name: "Test Customer",
      customer_email: "test5@example.com",
      customer_phone: "+919876543210",
      amount: 4999,
      currency: "INR",
      stage: "PAYMENT_FAILED",
      recovery_status: "IN_RECOVERY",
      failure_reason: null,
      last_event_id: null,
      cart_items: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: null
    };

    const auditActions: any[] = [];

    const mockSupabase = {
      from: (table: string) => {
        if (table === "recovery_cases") {
          return {
            select: () => ({
              or: (query: string) => ({
                maybeSingle: async () => ({ data: storedCase, error: null })
              }),
              eq: (col: string, val: any) => ({
                maybeSingle: async () => ({ data: storedCase, error: null })
              })
            }),
            update: (payload: any) => {
              storedCase = { ...storedCase, ...payload };
              return {
                eq: () => ({ error: null })
              };
            }
          };
        }
        if (table === "agent_actions") {
          return {
            insert: async (actionPayload: any) => {
              auditActions.push(actionPayload);
              return { data: actionPayload, error: null };
            }
          };
        }
        if (table === "orders") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: "test-order-005", payment_status: "Pending", total: 4999, items: [] },
                  error: null
                })
              })
            })
          };
        }
        if (table === "products") {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { stock: 10 }, error: null }) }) }),
            update: () => ({ eq: () => ({ error: null }) })
          };
        }
        return {
          select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          insert: async () => ({ data: null, error: null }),
          update: () => ({ eq: () => ({ error: null }) })
        };
      }
    };

    const webhookEvent = {
      id: "evt_rzp_paid_12345",
      event: "payment_link.paid",
      payload: {
        payment_link: {
          entity: {
            id: "plink_test_005",
            amount: 499900,
            amount_paid: 499900,
            currency: "INR",
            status: "paid",
            notes: {
              case_id: "rcase_rzp_005",
              internalOrderId: "test-order-005"
            }
          }
        },
        payment: {
          entity: {
            id: "pay_rzp_success_005",
            amount: 499900,
            currency: "INR",
            status: "captured"
          }
        }
      }
    };

    const rawBody = JSON.stringify(webhookEvent);
    const signature = createTestSignature(rawBody, mockWebhookSecret);

    const result = await processRecoveryPaymentWebhook({
      rawBody,
      signature,
      webhookSecret: mockWebhookSecret,
      supabaseClient: mockSupabase
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.statusCode, 200);
    assert.strictEqual(result.recoveryProcessed, true);
    assert.strictEqual(result.caseId, "rcase_rzp_005");
    assert.strictEqual(result.orderId, "test-order-005");
    assert.strictEqual(result.recoveredAmount, 4999);
    assert.strictEqual(result.status, "RECOVERED");

    // State transition verified
    assert.strictEqual(storedCase.recovery_status, "RECOVERED");
    assert.ok(storedCase.recovered_at !== null, "recovered_at timestamp must be set");

    // Audit action PAYMENT_RECOVERED verified
    const recoveryAction = auditActions.find((a) => a.action_type === "PAYMENT_RECOVERED");
    assert.ok(recoveryAction, "PAYMENT_RECOVERED must be logged in agent_actions");
    assert.strictEqual(recoveryAction.action_payload.recoveredAmount, 4999);
    assert.strictEqual(recoveryAction.action_payload.razorpayPaymentId, "pay_rzp_success_005");
  });

  // =========================================================================
  // Test 6: Duplicate Successful Webhook (Idempotency)
  // =========================================================================
  it("Test 6: Duplicate webhook for already RECOVERED case returns 200 without double-recovering", async () => {
    const recoveredCase: DbRecoveryCase = {
      id: "case-uuid-rzp-006",
      case_id: "rcase_rzp_006",
      order_id: "test-order-006",
      razorpay_order_id: "order_rzp_006",
      customer_id: "test-customer-006",
      customer_name: "Test Customer",
      customer_email: "test6@example.com",
      customer_phone: null,
      amount: 4999,
      currency: "INR",
      stage: "CHECKOUT_INITIATED",
      recovery_status: "RECOVERED", // Already marked recovered
      failure_reason: null,
      last_event_id: "rzp_evt_prev",
      cart_items: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: "2026-08-30T10:00:00.000Z"
    };

    let updateCount = 0;
    const mockSupabase = {
      from: (table: string) => {
        if (table === "recovery_cases") {
          return {
            select: () => ({
              or: () => ({ maybeSingle: async () => ({ data: recoveredCase, error: null }) }),
              eq: () => ({ maybeSingle: async () => ({ data: recoveredCase, error: null }) })
            }),
            update: () => {
              updateCount++;
              return { eq: () => ({ error: null }) };
            }
          };
        }
        return {
          select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          insert: async () => ({ error: null }),
          update: () => ({ eq: () => ({ error: null }) })
        };
      }
    };

    const webhookEvent = {
      id: "evt_rzp_dup_paid",
      event: "payment_link.paid",
      payload: {
        payment_link: {
          entity: {
            id: "plink_test_006",
            amount: 499900,
            currency: "INR",
            notes: { case_id: "rcase_rzp_006" }
          }
        },
        payment: {
          entity: { id: "pay_rzp_006", amount: 499900, currency: "INR" }
        }
      }
    };

    const rawBody = JSON.stringify(webhookEvent);
    const signature = createTestSignature(rawBody, mockWebhookSecret);

    const result = await processRecoveryPaymentWebhook({
      rawBody,
      signature,
      webhookSecret: mockWebhookSecret,
      supabaseClient: mockSupabase
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.isDuplicate, true);
    assert.strictEqual(result.recoveryProcessed, false);
    assert.strictEqual(updateCount, 0, "Must not perform duplicate DB mutations for already recovered case");
  });

  // =========================================================================
  // Test 7: Invalid Webhook Signature
  // =========================================================================
  it("Test 7: Webhook with invalid signature is rejected with status 400", async () => {
    const rawBody = JSON.stringify({
      event: "payment_link.paid",
      payload: { payment: { entity: { id: "pay_fraud", amount: 499900, currency: "INR" } } }
    });

    const forgedSignature = "invalid_signature_hex_1234567890abcdef";

    const result = await processRecoveryPaymentWebhook({
      rawBody,
      signature: forgedSignature,
      webhookSecret: mockWebhookSecret
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 400);
    assert.strictEqual(result.error, "Invalid signature");
  });

  // =========================================================================
  // Test 8: Amount Mismatch
  // =========================================================================
  it("Test 8: Webhook with amount mismatch (₹100 vs ₹4,999) is rejected", async () => {
    const mockCase: DbRecoveryCase = {
      id: "case-uuid-rzp-008",
      case_id: "rcase_rzp_008",
      order_id: "test-order-008",
      razorpay_order_id: null,
      customer_id: "test-customer-008",
      customer_name: "Test Customer 8",
      customer_email: "test8@example.com",
      customer_phone: null,
      amount: 4999, // ₹4,999 expected (499900 paise)
      currency: "INR",
      stage: "PAYMENT_FAILED",
      recovery_status: "IN_RECOVERY",
      failure_reason: null,
      last_event_id: null,
      cart_items: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: null
    };

    const mockSupabase = {
      from: () => ({
        select: () => ({
          or: () => ({ maybeSingle: async () => ({ data: mockCase, error: null }) }),
          eq: () => ({ maybeSingle: async () => ({ data: mockCase, error: null }) })
        })
      })
    };

    // Fraudulent / partial payload sending only ₹100 (10000 paise)
    const webhookEvent = {
      id: "evt_rzp_mismatch",
      event: "payment_link.paid",
      payload: {
        payment_link: {
          entity: {
            id: "plink_test_008",
            amount: 10000, // Only ₹100
            currency: "INR",
            notes: { case_id: "rcase_rzp_008" }
          }
        },
        payment: {
          entity: { id: "pay_mismatch_008", amount: 10000, currency: "INR" }
        }
      }
    };

    const rawBody = JSON.stringify(webhookEvent);
    const signature = createTestSignature(rawBody, mockWebhookSecret);

    const result = await processRecoveryPaymentWebhook({
      rawBody,
      signature,
      webhookSecret: mockWebhookSecret,
      supabaseClient: mockSupabase
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 400);
    assert.ok(result.error?.includes("Amount mismatch"));
    assert.strictEqual(mockCase.recovery_status, "IN_RECOVERY", "Case must NOT transition to RECOVERED");
  });

  // =========================================================================
  // Test 9: Currency Mismatch
  // =========================================================================
  it("Test 9: Webhook with currency mismatch (USD vs INR) is rejected", async () => {
    const mockCase: DbRecoveryCase = {
      id: "case-uuid-rzp-009",
      case_id: "rcase_rzp_009",
      order_id: "test-order-009",
      razorpay_order_id: null,
      customer_id: "test-customer-009",
      customer_name: "Test Customer 9",
      customer_email: "test9@example.com",
      customer_phone: null,
      amount: 4999,
      currency: "INR", // INR expected
      stage: "PAYMENT_FAILED",
      recovery_status: "IN_RECOVERY",
      failure_reason: null,
      last_event_id: null,
      cart_items: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: null
    };

    const mockSupabase = {
      from: () => ({
        select: () => ({
          or: () => ({ maybeSingle: async () => ({ data: mockCase, error: null }) }),
          eq: () => ({ maybeSingle: async () => ({ data: mockCase, error: null }) })
        })
      })
    };

    // Payload sent in USD instead of INR
    const webhookEvent = {
      id: "evt_rzp_curr_mismatch",
      event: "payment_link.paid",
      payload: {
        payment_link: {
          entity: {
            id: "plink_test_009",
            amount: 499900,
            currency: "USD",
            notes: { case_id: "rcase_rzp_009" }
          }
        },
        payment: {
          entity: { id: "pay_009", amount: 499900, currency: "USD" }
        }
      }
    };

    const rawBody = JSON.stringify(webhookEvent);
    const signature = createTestSignature(rawBody, mockWebhookSecret);

    const result = await processRecoveryPaymentWebhook({
      rawBody,
      signature,
      webhookSecret: mockWebhookSecret,
      supabaseClient: mockSupabase
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 400);
    assert.ok(result.error?.includes("Currency mismatch"));
  });

  // =========================================================================
  // Test 10: Payment Link Creation Failure (API Failure Resilience)
  // =========================================================================
  it("Test 10: Gracefully handles Razorpay API network/service failure without crashing", async () => {
    const mockCase: DbRecoveryCase = {
      id: "case-uuid-rzp-010",
      case_id: "rcase_rzp_010",
      order_id: "test-order-010",
      razorpay_order_id: null,
      customer_id: "test-customer-010",
      customer_name: "Test Customer 10",
      customer_email: "test10@example.com",
      customer_phone: null,
      amount: 4999,
      currency: "INR",
      stage: "PAYMENT_FAILED",
      recovery_status: "OPEN",
      failure_reason: null,
      last_event_id: null,
      cart_items: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: null
    };

    // Simulated failing Razorpay API
    const failingFetcher: typeof fetch = async () => {
      return {
        ok: false,
        status: 503,
        text: async () => JSON.stringify({
          error: {
            code: "GATEWAY_ERROR",
            description: "Razorpay Service Temporarily Unavailable"
          }
        })
      } as any;
    };

    const result = await executeRecoveryAction(
      {
        recoveryCase: mockCase,
        decision: {
          action: "RETRY_PAYMENT",
          priority: "HIGH",
          expectedRecovery: 4199.16,
          reason: "Retry"
        },
        policy: {
          allowed: true,
          reason: "All policies passed",
          policyConfig: DEFAULT_RECOVERY_POLICY
        }
      },
      {
        keyId: "test_key",
        keySecret: "test_secret",
        fetcher: failingFetcher
      }
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, "FAILED");
    assert.strictEqual(result.actionType, "RETRY_PAYMENT");
    assert.ok(result.error?.includes("Razorpay Service Temporarily Unavailable"));
  });
});

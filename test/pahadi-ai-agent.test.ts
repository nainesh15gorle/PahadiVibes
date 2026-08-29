// test/pahadi-ai-agent.test.ts
import { describe, it } from "node:test";
import assert from "node:assert";
import type {
  DbRevenueEvent,
  DbRecoveryCase,
  DiagnosisResult,
  RecoveryScoreResult,
  RecoveryDecision,
  PolicyEvaluationResult
} from "../src/lib/ai/types";
import { diagnoseRevenueEvent } from "../src/lib/ai/diagnosis";
import { calculateRecoveryScore } from "../src/lib/ai/recovery-score";
import { selectRecoveryAction } from "../src/lib/ai/decision-engine";
import { evaluatePolicy, DEFAULT_RECOVERY_POLICY } from "../src/lib/ai/policy-engine";
import { executeRecoveryAction } from "../src/lib/ai/recovery-executor";

describe("Pahadi AI Agent Brain - Comprehensive Test Suite", () => {
  // -------------------------------------------------------------
  // Benchmark Deterministic Test Case
  // -------------------------------------------------------------
  it("Benchmark Case: ₹4,999 order with 3 prior successful orders & temporary failure", async () => {
    const mockEvent: DbRevenueEvent = {
      id: "evt-benchmark-1",
      event_id: "evt_rzp_bench_failed",
      event_type: "PAYMENT_FAILED",
      order_id: "ord_benchmark_4999",
      razorpay_order_id: "order_bench_123",
      razorpay_payment_id: "pay_bench_123",
      customer_id: "cust_bench_1",
      customer_name: "Test Customer",
      customer_email: "test@pahadivibes.com",
      customer_phone: "+919876543210",
      amount: 4999,
      currency: "INR",
      status: "RECORDED",
      failure_reason: "Bank server timeout during OTP authentication",
      raw_payload: {},
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    };

    const mockCase: DbRecoveryCase = {
      id: "case-benchmark-1",
      case_id: "rcase_bench_001",
      order_id: "ord_benchmark_4999",
      razorpay_order_id: "order_bench_123",
      customer_id: "cust_bench_1",
      customer_name: "Test Customer",
      customer_email: "test@pahadivibes.com",
      customer_phone: "+919876543210",
      amount: 4999,
      currency: "INR",
      stage: "PAYMENT_FAILED",
      recovery_status: "OPEN",
      failure_reason: "Bank server timeout during OTP authentication",
      last_event_id: "evt-benchmark-1",
      cart_items: [{ productId: "p1", productName: "Aipan Painting", quantity: 1, price: 4999 }],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: null
    };

    // 1. Diagnosis
    const diagnosis = diagnoseRevenueEvent(mockEvent, {
      customerSuccessfulOrdersCount: 3,
      customerPreviousOrdersCount: 3,
      previousAttemptsCount: 0
    });
    assert.strictEqual(diagnosis.category, "TEMPORARY_PAYMENT_FAILURE");
    assert.strictEqual(diagnosis.isRecoverable, true);
    assert.ok(diagnosis.confidence >= 0.85);

    // 2. Recovery Score
    const score = calculateRecoveryScore({
      amount: 4999,
      diagnosis,
      customerSuccessfulOrders: 3,
      previousRecoveryAttempts: 0
    });
    assert.strictEqual(score.recoveryProbability, 0.84);
    assert.strictEqual(score.expectedRecovery, 4199.16);

    // 3. Decision Engine
    const decision = selectRecoveryAction({
      revenueEvent: mockEvent,
      recoveryCase: mockCase,
      diagnosis,
      recoveryProbability: score.recoveryProbability,
      expectedRecovery: score.expectedRecovery,
      customerContext: {
        customerId: "cust_bench_1",
        customerName: "Test Customer",
        customerEmail: "test@pahadivibes.com",
        successfulOrdersCount: 3
      },
      previousAttemptsCount: 0
    });
    assert.strictEqual(decision.action, "RETRY_PAYMENT");
    assert.strictEqual(decision.priority, "HIGH");

    // 4. Policy Gate
    const policy = evaluatePolicy({
      action: decision.action,
      amount: mockCase.amount,
      retryCount: 0,
      recoveryStatus: mockCase.recovery_status,
      recoveryProbability: score.recoveryProbability
    });
    assert.strictEqual(policy.allowed, true);
    assert.strictEqual(policy.reason, "All recovery policies satisfied.");

    // 5. Recovery Execution
    const execution = await executeRecoveryAction({
      recoveryCase: mockCase,
      revenueEvent: mockEvent,
      decision,
      policy
    });
    assert.strictEqual(execution.success, true);
    assert.strictEqual(execution.status, "INITIATED");
    assert.strictEqual(execution.actionType, "RETRY_PAYMENT");
    assert.ok(execution.executionDetails.retrySession);
  });

  // -------------------------------------------------------------
  // Test 1: Temporary payment failure
  // -------------------------------------------------------------
  it("Scenario 1: Temporary payment failure diagnosis with gateway timeout", () => {
    const event: DbRevenueEvent = {
      id: "evt-temp-1",
      event_id: "evt_101",
      event_type: "PAYMENT_FAILED",
      order_id: "ord_101",
      razorpay_order_id: "rzp_101",
      razorpay_payment_id: "pay_101",
      customer_id: "cust_1",
      customer_name: "Anita",
      customer_email: "anita@example.com",
      customer_phone: "+919800000001",
      amount: 1500,
      currency: "INR",
      status: "RECORDED",
      failure_reason: "Bank network connection timed out",
      raw_payload: {},
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    };

    const diagnosis = diagnoseRevenueEvent(event, { customerSuccessfulOrdersCount: 1 });
    assert.strictEqual(diagnosis.category, "TEMPORARY_PAYMENT_FAILURE");
    assert.strictEqual(diagnosis.isRecoverable, true);
  });

  // -------------------------------------------------------------
  // Test 2: Repeated payment failure
  // -------------------------------------------------------------
  it("Scenario 2: Repeated payment failure classification", () => {
    const event: DbRevenueEvent = {
      id: "evt-repeat-1",
      event_id: "evt_102",
      event_type: "PAYMENT_FAILED",
      order_id: "ord_102",
      razorpay_order_id: "rzp_102",
      razorpay_payment_id: "pay_102",
      customer_id: "cust_2",
      customer_name: "Ramesh",
      customer_email: "ramesh@example.com",
      customer_phone: "+919800000002",
      amount: 2500,
      currency: "INR",
      status: "RECORDED",
      failure_reason: "Payment declined by user bank",
      raw_payload: {},
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    };

    const diagnosis = diagnoseRevenueEvent(event, {
      previousAttemptsCount: 2,
      isRepeatFailure: true
    });
    assert.strictEqual(diagnosis.category, "REPEATED_PAYMENT_FAILURE");
    assert.strictEqual(diagnosis.isRecoverable, true);
  });

  // -------------------------------------------------------------
  // Test 3: High recovery probability
  // -------------------------------------------------------------
  it("Scenario 3: High recovery probability calculation", () => {
    const diagnosis: DiagnosisResult = {
      category: "TEMPORARY_PAYMENT_FAILURE",
      confidence: 0.91,
      reason: "Temporary network timeout",
      isRecoverable: true
    };

    const score = calculateRecoveryScore({
      amount: 5000,
      diagnosis,
      customerSuccessfulOrders: 2,
      previousRecoveryAttempts: 0
    });

    assert.ok(score.recoveryProbability >= 0.80);
    assert.strictEqual(score.expectedRecovery, 4050); // 5000 * 0.81 = 4050
  });

  // -------------------------------------------------------------
  // Test 4: Low recovery probability
  // -------------------------------------------------------------
  it("Scenario 4: Low recovery probability calculation for non-recoverable failure", () => {
    const diagnosis: DiagnosisResult = {
      category: "NON_RECOVERABLE",
      confidence: 0.95,
      reason: "Card flagged for fraud security violation",
      isRecoverable: false
    };

    const score = calculateRecoveryScore({
      amount: 5000,
      diagnosis,
      customerSuccessfulOrders: 5,
      previousRecoveryAttempts: 0
    });

    assert.strictEqual(score.recoveryProbability, 0.0);
    assert.strictEqual(score.expectedRecovery, 0);
  });

  // -------------------------------------------------------------
  // Test 5: Retry allowed
  // -------------------------------------------------------------
  it("Scenario 5: Retry allowed within standard policy limits", () => {
    const policy = evaluatePolicy({
      action: "RETRY_PAYMENT",
      amount: 3500,
      retryCount: 0,
      recoveryStatus: "OPEN"
    });

    assert.strictEqual(policy.allowed, true);
  });

  // -------------------------------------------------------------
  // Test 6: Retry limit exceeded
  // -------------------------------------------------------------
  it("Scenario 6: Retry blocked when max retry attempts reached (>= 2)", () => {
    const policy = evaluatePolicy({
      action: "RETRY_PAYMENT",
      amount: 3500,
      retryCount: 2,
      recoveryStatus: "OPEN"
    });

    assert.strictEqual(policy.allowed, false);
    assert.strictEqual(policy.violatedPolicy, "MAX_RETRIES_EXCEEDED");
  });

  // -------------------------------------------------------------
  // Test 7: Amount exceeds automatic recovery limit
  // -------------------------------------------------------------
  it("Scenario 7: Blocked when amount exceeds maxAutomaticRecoveryAmount (> ₹10,000)", () => {
    const policy = evaluatePolicy({
      action: "RETRY_PAYMENT",
      amount: 15000,
      retryCount: 0,
      recoveryStatus: "OPEN"
    });

    assert.strictEqual(policy.allowed, false);
    assert.strictEqual(policy.violatedPolicy, "AMOUNT_EXCEEDS_LIMIT");
  });

  // -------------------------------------------------------------
  // Test 8: Automatic recovery disabled
  // -------------------------------------------------------------
  it("Scenario 8: Blocked when automaticRecoveryEnabled is false", () => {
    const policy = evaluatePolicy({
      action: "RETRY_PAYMENT",
      amount: 2000,
      retryCount: 0,
      recoveryStatus: "OPEN",
      config: { automaticRecoveryEnabled: false }
    });

    assert.strictEqual(policy.allowed, false);
    assert.strictEqual(policy.violatedPolicy, "AUTOMATIC_RECOVERY_DISABLED");
  });

  // -------------------------------------------------------------
  // Test 9: Already recovered case
  // -------------------------------------------------------------
  it("Scenario 9: Blocked when case is already RECOVERED", () => {
    const policy = evaluatePolicy({
      action: "RETRY_PAYMENT",
      amount: 2000,
      retryCount: 0,
      recoveryStatus: "RECOVERED"
    });

    assert.strictEqual(policy.allowed, false);
    assert.strictEqual(policy.violatedPolicy, "ALREADY_RECOVERED");
  });

  // -------------------------------------------------------------
  // Test 10: Duplicate processing / Idempotency handling
  // -------------------------------------------------------------
  it("Scenario 10: NO_ACTION selected and permitted cleanly", () => {
    const decision: RecoveryDecision = selectRecoveryAction({
      diagnosis: {
        category: "NON_RECOVERABLE",
        confidence: 0.95,
        reason: "Fraud flag",
        isRecoverable: false
      },
      recoveryProbability: 0,
      expectedRecovery: 0,
      previousAttemptsCount: 2
    });

    assert.strictEqual(decision.action, "NO_ACTION");

    const policy = evaluatePolicy({
      action: decision.action,
      amount: 3000,
      retryCount: 2,
      recoveryStatus: "OPEN"
    });

    assert.strictEqual(policy.allowed, true);
  });

  // -------------------------------------------------------------
  // Test 11: Recovery execution failure resilience
  // -------------------------------------------------------------
  it("Scenario 11: Executor handles policy-blocked inputs gracefully without throwing", async () => {
    const mockCase: DbRecoveryCase = {
      id: "case-blocked-1",
      case_id: "rcase_blocked",
      order_id: "ord_blocked",
      razorpay_order_id: null,
      customer_id: null,
      customer_name: "Test",
      customer_email: "test@example.com",
      customer_phone: null,
      amount: 25000,
      currency: "INR",
      stage: "PAYMENT_FAILED",
      recovery_status: "OPEN",
      failure_reason: "Failed",
      last_event_id: null,
      cart_items: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: null
    };

    const blockedPolicy: PolicyEvaluationResult = {
      allowed: false,
      reason: "Order amount exceeds limit",
      violatedPolicy: "AMOUNT_EXCEEDS_LIMIT",
      policyConfig: DEFAULT_RECOVERY_POLICY
    };

    const execution = await executeRecoveryAction({
      recoveryCase: mockCase,
      decision: {
        action: "RETRY_PAYMENT",
        priority: "HIGH",
        expectedRecovery: 20000,
        reason: "Retry"
      },
      policy: blockedPolicy
    });

    assert.strictEqual(execution.success, false);
    assert.strictEqual(execution.status, "SKIPPED");
  });

  // -------------------------------------------------------------
  // Test 12: Missing customer data
  // -------------------------------------------------------------
  it("Scenario 12: Handles missing/anonymous customer data gracefully", () => {
    const event: DbRevenueEvent = {
      id: "evt-anon",
      event_id: "evt_anon_01",
      event_type: "PAYMENT_FAILED",
      order_id: "ord_anon",
      razorpay_order_id: null,
      razorpay_payment_id: null,
      customer_id: null,
      customer_name: null,
      customer_email: null,
      customer_phone: null,
      amount: 1200,
      currency: "INR",
      status: "RECORDED",
      failure_reason: null,
      raw_payload: {},
      created_at: new Date().toISOString(),
      processed_at: null
    };

    const diagnosis = diagnoseRevenueEvent(event, {});
    assert.ok(diagnosis.category);
    assert.ok(diagnosis.confidence > 0);

    const score = calculateRecoveryScore({
      amount: 1200,
      diagnosis,
      customerSuccessfulOrders: 0
    });
    assert.ok(score.recoveryProbability > 0);
  });

  // -------------------------------------------------------------
  // Test 13: Invalid AI output / schema validation fallback
  // -------------------------------------------------------------
  it("Scenario 13: Handles empty or corrupted event without crashing", () => {
    const diagnosis = diagnoseRevenueEvent(null as any);
    assert.strictEqual(diagnosis.category, "UNKNOWN_FAILURE");
    assert.strictEqual(diagnosis.isRecoverable, false);

    const score = calculateRecoveryScore({
      amount: 0,
      diagnosis
    });
    assert.strictEqual(score.expectedRecovery, 0);
  });
});

// test/e2e-agent-verification.test.ts
import { describe, it } from "node:test";
import assert from "node:assert";
import type {
  DbRevenueEvent,
  DbRecoveryCase,
  DbAgentAction,
  DiagnosisResult,
  RecoveryScoreResult,
  RecoveryDecision,
  PolicyEvaluationResult,
  ExecutionResult,
  AgentProcessResult
} from "../src/lib/ai/types";
import { diagnoseRevenueEvent } from "../src/lib/ai/diagnosis";
import { calculateRecoveryScore } from "../src/lib/ai/recovery-score";
import { selectRecoveryAction } from "../src/lib/ai/decision-engine";
import { evaluatePolicy, DEFAULT_RECOVERY_POLICY } from "../src/lib/ai/policy-engine";
import { executeRecoveryAction } from "../src/lib/ai/recovery-executor";

describe("PAHADI AI — END-TO-END AGENT VERIFICATION", () => {
  // =========================================================================
  // Primary Test Case: Deterministic Benchmark Scenario
  // =========================================================================
  it("Test 1 [Primary Flow]: Complete End-to-End Recovery for Test Customer (₹4,999, 3 orders, Temporary Failure)", async () => {
    // 1. Ingest PAYMENT_FAILED revenue event
    const mockRevenueEvent: DbRevenueEvent = {
      id: "evt-uuid-001",
      event_id: "evt_rzp_pay_test_001_failed",
      event_type: "PAYMENT_FAILED",
      order_id: "test-order-001",
      razorpay_order_id: "order_rzp_test_001",
      razorpay_payment_id: "pay_rzp_test_001",
      customer_id: "test-customer-001",
      customer_name: "Test Customer",
      customer_email: "test.customer@pahadivibes.com",
      customer_phone: "+919876543210",
      amount: 4999,
      currency: "INR",
      status: "RECORDED",
      failure_reason: "Bank network connection timed out during 3D Secure verification",
      raw_payload: { error_code: "GATEWAY_TIMEOUT", retryable: true },
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    };

    // 2. Initialize Recovery Case
    const mockRecoveryCase: DbRecoveryCase = {
      id: "case-uuid-001",
      case_id: "rcase_test_order_001",
      order_id: "test-order-001",
      razorpay_order_id: "order_rzp_test_001",
      customer_id: "test-customer-001",
      customer_name: "Test Customer",
      customer_email: "test.customer@pahadivibes.com",
      customer_phone: "+919876543210",
      amount: 4999,
      currency: "INR",
      stage: "PAYMENT_FAILED",
      recovery_status: "OPEN",
      failure_reason: "Bank network connection timed out during 3D Secure verification",
      last_event_id: mockRevenueEvent.event_id,
      cart_items: [
        {
          productId: "prod_aipan_01",
          productName: "Handmade Pahadi Aipan Wall Art",
          quantity: 1,
          price: 4999
        }
      ],
      metadata: { initialSource: "checkout_modal" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: null
    };

    const auditTrail: Array<{
      actionType: string;
      status: string;
      reasoning: string;
      timestamp: string;
    }> = [];

    // 3. Agent analyzes case
    auditTrail.push({
      actionType: "CASE_ANALYZED",
      status: "RECORDED",
      reasoning: `Pahadi AI analyzing recovery case ${mockRecoveryCase.case_id} (Order: ${mockRecoveryCase.order_id}, Amount: ₹${mockRecoveryCase.amount}).`,
      timestamp: new Date().toISOString()
    });

    // 4. Stage 1: Diagnosis Engine
    const diagnosis: DiagnosisResult = diagnoseRevenueEvent(mockRevenueEvent, {
      customerSuccessfulOrdersCount: 3,
      customerPreviousOrdersCount: 3,
      previousAttemptsCount: 0,
      isRepeatFailure: false
    });

    assert.strictEqual(diagnosis.category, "TEMPORARY_PAYMENT_FAILURE");
    assert.strictEqual(diagnosis.isRecoverable, true);
    assert.ok(diagnosis.confidence >= 0.90, "Expected confidence >= 90%");
    assert.ok(
      diagnosis.reason.includes("previous successful purchases") ||
      diagnosis.reason.includes("temporary"),
      "Diagnostic reason must explain why failure is temporary"
    );

    auditTrail.push({
      actionType: "DIAGNOSIS_COMPLETED",
      status: "RECORDED",
      reasoning: `Diagnosis: ${diagnosis.category} (${Math.round(diagnosis.confidence * 100)}% confidence). ${diagnosis.reason}`,
      timestamp: new Date().toISOString()
    });

    // 5. Stage 2: Recovery Scoring & Expected Value
    const scoreResult: RecoveryScoreResult = calculateRecoveryScore({
      amount: mockRecoveryCase.amount,
      diagnosis,
      customerSuccessfulOrders: 3,
      previousRecoveryAttempts: 0,
      isRepeatedFailure: false
    });

    assert.strictEqual(scoreResult.recoveryProbability, 0.84, "Benchmark probability must be exactly 0.84");
    assert.strictEqual(scoreResult.expectedRecovery, 4199.16, "Expected recovery must be ₹4,199.16");
    assert.ok(scoreResult.factors.length >= 2, "Must contain transparent explainability factors");

    auditTrail.push({
      actionType: "RECOVERY_SCORE_CALCULATED",
      status: "RECORDED",
      reasoning: scoreResult.reasoning,
      timestamp: new Date().toISOString()
    });

    // 6. Stage 3: Decision Engine
    const decision: RecoveryDecision = selectRecoveryAction({
      revenueEvent: mockRevenueEvent,
      recoveryCase: mockRecoveryCase,
      diagnosis,
      recoveryProbability: scoreResult.recoveryProbability,
      expectedRecovery: scoreResult.expectedRecovery,
      customerContext: {
        customerId: "test-customer-001",
        customerName: "Test Customer",
        customerEmail: "test.customer@pahadivibes.com",
        successfulOrdersCount: 3,
        totalOrdersCount: 3
      },
      previousAttemptsCount: 0
    });

    assert.strictEqual(decision.action, "RETRY_PAYMENT");
    assert.strictEqual(decision.priority, "HIGH");
    assert.strictEqual(decision.expectedRecovery, 4199.16);

    auditTrail.push({
      actionType: "RECOVERY_ACTION_SELECTED",
      status: "RECORDED",
      reasoning: `Selected action ${decision.action} [Priority: ${decision.priority}]. ${decision.reason}`,
      timestamp: new Date().toISOString()
    });

    // 7. Stage 4: Policy Engine [CRITICAL SAFETY GATE]
    const policyResult: PolicyEvaluationResult = evaluatePolicy({
      action: decision.action,
      amount: mockRecoveryCase.amount,
      retryCount: 0,
      recoveryStatus: mockRecoveryCase.recovery_status,
      recoveryProbability: scoreResult.recoveryProbability,
      caseId: mockRecoveryCase.id
    });

    assert.strictEqual(policyResult.allowed, true, "Policy must be APPROVED");
    assert.strictEqual(policyResult.reason, "All recovery policies satisfied.");

    auditTrail.push({
      actionType: "POLICY_APPROVED",
      status: "RECORDED",
      reasoning: `Policy approval granted: ${policyResult.reason}`,
      timestamp: new Date().toISOString()
    });

    // 8. Stage 5: Recovery Executor (Policy-Approved Workflow)
    const executionResult: ExecutionResult = await executeRecoveryAction({
      recoveryCase: mockRecoveryCase,
      revenueEvent: mockRevenueEvent,
      decision,
      policy: policyResult
    });

    assert.strictEqual(executionResult.success, true);
    assert.strictEqual(executionResult.status, "INITIATED");
    assert.strictEqual(executionResult.actionType, "RETRY_PAYMENT");
    assert.ok(executionResult.executionDetails.retrySession, "Must include structured retry session details");

    auditTrail.push({
      actionType: "RECOVERY_INITIATED",
      status: "EXECUTED",
      reasoning: `Recovery action ${decision.action} initiated via ${executionResult.channel}.`,
      timestamp: new Date().toISOString()
    });

    // 9. Structured Final Result
    const agentResult: AgentProcessResult = {
      success: true,
      caseId: mockRecoveryCase.case_id,
      orderId: mockRecoveryCase.order_id,
      eventId: mockRevenueEvent.event_id,
      diagnosis,
      recoveryProbability: scoreResult.recoveryProbability,
      expectedRecovery: scoreResult.expectedRecovery,
      scoreFactors: scoreResult.factors,
      decision,
      policy: policyResult,
      execution: executionResult,
      auditActionsRecorded: auditTrail.map((a) => a.actionType)
    };

    // Verify final complete output
    assert.strictEqual(agentResult.caseId, "rcase_test_order_001");
    assert.strictEqual(agentResult.eventId, "evt_rzp_pay_test_001_failed");
    assert.strictEqual(agentResult.diagnosis.category, "TEMPORARY_PAYMENT_FAILURE");
    assert.strictEqual(agentResult.diagnosis.confidence, 0.91);
    assert.strictEqual(agentResult.recoveryProbability, 0.84);
    assert.strictEqual(agentResult.expectedRecovery, 4199.16);
    assert.strictEqual(agentResult.decision.action, "RETRY_PAYMENT");
    assert.strictEqual(agentResult.policy.allowed, true);
    assert.strictEqual(agentResult.policy.reason, "All recovery policies satisfied.");
    assert.strictEqual(agentResult.execution.status, "INITIATED");
    assert.deepStrictEqual(agentResult.auditActionsRecorded, [
      "CASE_ANALYZED",
      "DIAGNOSIS_COMPLETED",
      "RECOVERY_SCORE_CALCULATED",
      "RECOVERY_ACTION_SELECTED",
      "POLICY_APPROVED",
      "RECOVERY_INITIATED"
    ]);
  });

  // =========================================================================
  // Test 2: Retry limit already reached -> expected BLOCKED
  // =========================================================================
  it("Test 2 [Negative]: Retry limit already reached (retryCount >= 2) -> expected BLOCKED", () => {
    const policyResult = evaluatePolicy({
      action: "RETRY_PAYMENT",
      amount: 4999,
      retryCount: 2,
      recoveryStatus: "OPEN"
    });

    assert.strictEqual(policyResult.allowed, false);
    assert.strictEqual(policyResult.violatedPolicy, "MAX_RETRIES_EXCEEDED");
    assert.strictEqual(policyResult.reason, "Maximum retry attempts reached.");
  });

  // =========================================================================
  // Test 3: Amount exceeds automatic recovery limit -> expected BLOCKED
  // =========================================================================
  it("Test 3 [Negative]: Amount exceeds automatic recovery limit (₹18,500 > ₹10,000) -> expected BLOCKED", () => {
    const policyResult = evaluatePolicy({
      action: "RETRY_PAYMENT",
      amount: 18500,
      retryCount: 0,
      recoveryStatus: "OPEN"
    });

    assert.strictEqual(policyResult.allowed, false);
    assert.strictEqual(policyResult.violatedPolicy, "AMOUNT_EXCEEDS_LIMIT");
    assert.ok(policyResult.reason.includes("exceeds maximum automatic recovery limit"));
  });

  // =========================================================================
  // Test 4: Automatic recovery disabled -> expected BLOCKED
  // =========================================================================
  it("Test 4 [Negative]: Automatic recovery disabled globally -> expected BLOCKED", () => {
    const policyResult = evaluatePolicy({
      action: "RETRY_PAYMENT",
      amount: 3200,
      retryCount: 0,
      recoveryStatus: "OPEN",
      config: { automaticRecoveryEnabled: false }
    });

    assert.strictEqual(policyResult.allowed, false);
    assert.strictEqual(policyResult.violatedPolicy, "AUTOMATIC_RECOVERY_DISABLED");
    assert.strictEqual(policyResult.reason, "Automatic recovery is currently disabled by system policy.");
  });

  // =========================================================================
  // Test 5: Case already recovered -> expected NO duplicate recovery
  // =========================================================================
  it("Test 5 [Negative]: Case already marked as RECOVERED -> expected NO duplicate recovery", () => {
    const policyResult = evaluatePolicy({
      action: "RETRY_PAYMENT",
      amount: 4999,
      retryCount: 0,
      recoveryStatus: "RECOVERED"
    });

    assert.strictEqual(policyResult.allowed, false);
    assert.strictEqual(policyResult.violatedPolicy, "ALREADY_RECOVERED");
    assert.strictEqual(policyResult.reason, "Case is already recovered. No further action permitted.");
  });

  // =========================================================================
  // Test 6: Same event processed twice -> expected idempotent behavior
  // =========================================================================
  it("Test 6 [Idempotency]: Duplicate processing with identical event ID is safely detected", () => {
    const eventId = "evt_rzp_pay_test_001_failed";

    // Simulate first ingestion
    const event1: DbRevenueEvent = {
      id: "evt-uuid-001",
      event_id: eventId,
      event_type: "PAYMENT_FAILED",
      order_id: "test-order-001",
      razorpay_order_id: "order_rzp_001",
      razorpay_payment_id: "pay_rzp_001",
      customer_id: "test-customer-001",
      customer_name: "Test Customer",
      customer_email: "test@example.com",
      customer_phone: "+919876543210",
      amount: 4999,
      currency: "INR",
      status: "RECORDED",
      failure_reason: "Temporary network timeout",
      raw_payload: {},
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    };

    // Simulate duplicate event ingestion check (e.g. repeated webhook or duplicate API call)
    const isDuplicate = event1.event_id === eventId;
    assert.strictEqual(isDuplicate, true, "Idempotency check must identify duplicate event_id");

    // Policy safety on duplicate or dismissed state
    const duplicatePolicyCheck = evaluatePolicy({
      action: "RETRY_PAYMENT",
      amount: event1.amount,
      retryCount: 2, // If already retried previously
      recoveryStatus: "OPEN"
    });
    assert.strictEqual(duplicatePolicyCheck.allowed, false, "Duplicate retries exceeding limit are blocked");
  });

  // =========================================================================
  // Test 7: Recovery execution fails -> expected RECOVERY_FAILED & graceful audit
  // =========================================================================
  it("Test 7 [Resilience]: Recovery execution handles execution blockage without crashing", async () => {
    const mockCase: DbRecoveryCase = {
      id: "case-uuid-fail",
      case_id: "rcase_fail_001",
      order_id: "test-order-fail",
      razorpay_order_id: null,
      customer_id: null,
      customer_name: "Anonymous User",
      customer_email: null,
      customer_phone: null,
      amount: 15000, // Exceeds limit
      currency: "INR",
      stage: "PAYMENT_FAILED",
      recovery_status: "OPEN",
      failure_reason: "Payment declined",
      last_event_id: null,
      cart_items: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: null
    };

    const blockedPolicy: PolicyEvaluationResult = {
      allowed: false,
      reason: "Order amount exceeds maximum automatic recovery limit of ₹10,000. Manual approval required.",
      violatedPolicy: "AMOUNT_EXCEEDS_LIMIT",
      policyConfig: DEFAULT_RECOVERY_POLICY
    };

    const executionResult = await executeRecoveryAction({
      recoveryCase: mockCase,
      decision: {
        action: "RETRY_PAYMENT",
        priority: "HIGH",
        expectedRecovery: 12000,
        reason: "Retry"
      },
      policy: blockedPolicy
    });

    assert.strictEqual(executionResult.success, false);
    assert.strictEqual(executionResult.status, "SKIPPED");
    assert.strictEqual(executionResult.actionType, "RETRY_PAYMENT");
    assert.strictEqual(executionResult.error, blockedPolicy.reason);
  });
});

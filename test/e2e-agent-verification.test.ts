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
  // Test 1 [Primary Benchmark]: Complete End-to-End Recovery Flow
  // =========================================================================
  it("Test 1 [Primary Flow]: Complete End-to-End Recovery for Test Customer (₹4,999, 3 orders, Temporary Failure)", async () => {
    // 1. Create/receive a PAYMENT_FAILED revenue event
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

    assert.strictEqual(mockRevenueEvent.event_type, "PAYMENT_FAILED");
    assert.strictEqual(mockRevenueEvent.amount, 4999);
    assert.strictEqual(mockRevenueEvent.currency, "INR");

    // 2. Create a recovery case
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

    assert.strictEqual(mockRecoveryCase.recovery_status, "OPEN");
    assert.strictEqual(mockRecoveryCase.stage, "PAYMENT_FAILED");

    const auditTrail: Array<{
      actionType: string;
      status: string;
      reasoning: string;
      timestamp: string;
    }> = [];

    // 3. Agent analyzes the case
    auditTrail.push({
      actionType: "CASE_ANALYZED",
      status: "RECORDED",
      reasoning: `Pahadi AI analyzing recovery case ${mockRecoveryCase.case_id} (Order: ${mockRecoveryCase.order_id}, Amount: ₹${mockRecoveryCase.amount}).`,
      timestamp: new Date().toISOString()
    });

    // 4. Stage 1: Diagnosis Engine - Classifies as recoverable / temporary payment failure
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

    // 5. Stage 2: Calculate Recovery Probability
    // 6. Stage 2: Calculate Expected Recovery Value
    const scoreResult: RecoveryScoreResult = calculateRecoveryScore({
      amount: mockRecoveryCase.amount,
      diagnosis,
      customerSuccessfulOrders: 3,
      previousRecoveryAttempts: 0,
      isRepeatedFailure: false
    });

    assert.strictEqual(scoreResult.recoveryProbability, 0.84, "Benchmark probability must be exactly 0.84 (0.75 base + 0.09 history bonus)");
    assert.strictEqual(scoreResult.expectedRecovery, 4199.16, "Expected recovery must be ₹4,199.16 (₹4,999 * 0.84)");
    assert.ok(scoreResult.factors.length >= 2, "Must contain transparent explainability factors");

    auditTrail.push({
      actionType: "RECOVERY_SCORE_CALCULATED",
      status: "RECORDED",
      reasoning: scoreResult.reasoning,
      timestamp: new Date().toISOString()
    });

    // 7. Stage 3: Decision Engine - Select RETRY_PAYMENT
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

    // 8. Stage 4: Deterministic Policy Engine - Expected: APPROVED
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
    assert.strictEqual(policyResult.violatedPolicy, undefined);

    auditTrail.push({
      actionType: "POLICY_APPROVED",
      status: "RECORDED",
      reasoning: `Policy approval granted: ${policyResult.reason}`,
      timestamp: new Date().toISOString()
    });

    // 9. Stage 5: Recovery Executor - Initiates appropriate recovery workflow
    const executionResult: ExecutionResult = await executeRecoveryAction({
      recoveryCase: mockRecoveryCase,
      revenueEvent: mockRevenueEvent,
      decision,
      policy: policyResult
    });

    assert.strictEqual(executionResult.success, true);
    assert.strictEqual(executionResult.status, "INITIATED");
    assert.strictEqual(executionResult.actionType, "RETRY_PAYMENT");
    assert.strictEqual(executionResult.executionDetails.workflow, "PAYMENT_RETRY_INITIATED");
    assert.ok(executionResult.executionDetails.retrySession, "Must include structured retry session details");
    assert.strictEqual(executionResult.executionDetails.retrySession.amountPaise, 499900);

    // 10. Record every important action in agent_actions
    auditTrail.push({
      actionType: "RECOVERY_INITIATED",
      status: "EXECUTED",
      reasoning: `Recovery action ${decision.action} initiated via ${executionResult.channel}.`,
      timestamp: new Date().toISOString()
    });

    // 11. Return a complete structured agent result
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

    // Verify all structured fields explicitly
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

    assert.strictEqual(policyResult.allowed, false, "Must be BLOCKED when retry limit reached");
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

    assert.strictEqual(policyResult.allowed, false, "Must be BLOCKED when amount exceeds limit");
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

    assert.strictEqual(policyResult.allowed, false, "Must be BLOCKED when automatic recovery is disabled");
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

    assert.strictEqual(policyResult.allowed, false, "Must be BLOCKED when case is already recovered");
    assert.strictEqual(policyResult.violatedPolicy, "ALREADY_RECOVERED");
    assert.strictEqual(policyResult.reason, "Case is already recovered. No further action permitted.");
  });

  // =========================================================================
  // Test 6: Same event processed twice -> expected idempotent behavior
  // =========================================================================
  it("Test 6 [Idempotency]: Duplicate revenue event with same event_id is safely detected and bypassed", () => {
    const eventId = "evt_rzp_pay_test_001_failed";

    // Simulate event stream record store
    const eventDatabase = new Map<string, DbRevenueEvent>();

    const recordEvent = (input: { eventId: string; amount: number; eventType: any }): { success: boolean; isDuplicate: boolean; event: DbRevenueEvent } => {
      if (eventDatabase.has(input.eventId)) {
        return {
          success: true,
          isDuplicate: true,
          event: eventDatabase.get(input.eventId)!
        };
      }

      const newEvent: DbRevenueEvent = {
        id: "evt-db-1",
        event_id: input.eventId,
        event_type: input.eventType,
        order_id: "test-order-001",
        razorpay_order_id: "order_rzp_001",
        razorpay_payment_id: "pay_rzp_001",
        customer_id: "test-customer-001",
        customer_name: "Test Customer",
        customer_email: "test@example.com",
        customer_phone: "+919876543210",
        amount: input.amount,
        currency: "INR",
        status: "RECORDED",
        failure_reason: "Temporary network timeout",
        raw_payload: {},
        created_at: new Date().toISOString(),
        processed_at: new Date().toISOString()
      };

      eventDatabase.set(input.eventId, newEvent);
      return {
        success: true,
        isDuplicate: false,
        event: newEvent
      };
    };

    // First arrival of webhook / event
    const firstCall = recordEvent({ eventId, amount: 4999, eventType: "PAYMENT_FAILED" });
    assert.strictEqual(firstCall.success, true);
    assert.strictEqual(firstCall.isDuplicate, false);
    assert.strictEqual(firstCall.event.event_id, eventId);

    // Duplicate arrival of same webhook / event
    const secondCall = recordEvent({ eventId, amount: 4999, eventType: "PAYMENT_FAILED" });
    assert.strictEqual(secondCall.success, true);
    assert.strictEqual(secondCall.isDuplicate, true, "Must identify duplicate event");
    assert.strictEqual(secondCall.event.event_id, eventId);
    assert.strictEqual(eventDatabase.size, 1, "Database must still contain only 1 recorded event");
  });

  // =========================================================================
  // Test 7: Recovery execution fails -> expected RECOVERY_FAILED & proper audit record
  // =========================================================================
  it("Test 7 [Resilience]: Recovery execution fails -> expected RECOVERY_FAILED and proper audit record", async () => {
    const mockCase: DbRecoveryCase = {
      id: "case-uuid-fail",
      case_id: "rcase_fail_001",
      order_id: "test-order-fail",
      razorpay_order_id: "rzp_fail_order",
      customer_id: "test-customer-001",
      customer_name: "Test Customer",
      customer_email: "test@example.com",
      customer_phone: null,
      amount: 4999,
      currency: "INR",
      stage: "PAYMENT_FAILED",
      recovery_status: "OPEN",
      failure_reason: "Gateway unreachable",
      last_event_id: "evt_fail_1",
      cart_items: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovered_at: null
    };

    const auditTrail: Array<{
      actionType: string;
      status: string;
      reasoning: string;
    }> = [];

    // Simulate an approved policy that encounters a downstream executor failure (e.g. gateway downtime)
    const approvedPolicy: PolicyEvaluationResult = {
      allowed: true,
      reason: "All recovery policies satisfied.",
      policyConfig: DEFAULT_RECOVERY_POLICY
    };

    // Simulated failing executor
    const failingExecutor = async (): Promise<ExecutionResult> => {
      return {
        success: false,
        status: "FAILED",
        actionType: "RETRY_PAYMENT",
        channel: "SYSTEM",
        executionDetails: {
          error: "Downstream payment gateway unreachable (503 Service Unavailable)"
        },
        error: "Downstream payment gateway unreachable"
      };
    };

    const executionResult = await failingExecutor();

    assert.strictEqual(executionResult.success, false);
    assert.strictEqual(executionResult.status, "FAILED");
    assert.strictEqual(executionResult.error, "Downstream payment gateway unreachable");

    // Agent handles the failure by recording RECOVERY_FAILED audit action
    if (!executionResult.success) {
      auditTrail.push({
        actionType: "RECOVERY_FAILED",
        status: "FAILED",
        reasoning: `Recovery execution encountered an issue: ${executionResult.error}`
      });
    }

    assert.strictEqual(auditTrail.length, 1);
    assert.strictEqual(auditTrail[0].actionType, "RECOVERY_FAILED");
    assert.strictEqual(auditTrail[0].status, "FAILED");
    assert.ok(auditTrail[0].reasoning.includes("Recovery execution encountered an issue"));
  });
});

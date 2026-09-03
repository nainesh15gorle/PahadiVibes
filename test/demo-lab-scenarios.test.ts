// test/demo-lab-scenarios.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import crypto from "crypto";
import { initializeDemoCase, DEMO_SCENARIOS } from "../src/lib/ai/demo-init";
import { processRecoveryCase } from "../src/lib/ai/agent";
import { processRecoveryPaymentWebhook } from "../src/lib/ai/recovery-executor";
import { supabaseAdmin } from "../src/lib/supabase";
import { aiDataStore } from "../src/lib/ai/data-store";

describe("PAHADI AI — RECOVERY LAB & DEMO INITIALIZATION TEST SUITE", () => {
  beforeEach(() => {
    // Reset fallback AI store to a clean slate before each test run
    aiDataStore.clearAll();
  });

  // =========================================================================
  // Test 1: Demo Case Initialization
  // =========================================================================
  it("Test 1: Initializes deterministic demo case and persists into database", async () => {
    const initRes = await initializeDemoCase("temp_failure");

    assert.strictEqual(initRes.success, true);
    assert.ok(initRes.recoveryCase, "Recovery case must exist");
    assert.ok(initRes.revenueEvent, "Revenue event must exist");
    assert.strictEqual(initRes.recoveryCase.order_id, "demo-order-temp-001");
    assert.strictEqual(initRes.recoveryCase.customer_name, "Test Customer");
    assert.strictEqual(initRes.recoveryCase.amount, 4999);
    assert.strictEqual(initRes.recoveryCase.currency, "INR");
    assert.strictEqual(initRes.recoveryCase.recovery_status, "OPEN");

    // Verify database query directly
    const { data: dbCase, error } = await supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .eq("order_id", "demo-order-temp-001")
      .maybeSingle();

    assert.strictEqual(error, null);
    assert.ok(dbCase, "Case must be queryable directly from database");
    assert.strictEqual(dbCase.case_id, "rcase_demo_temp_001");
  });

  // =========================================================================
  // Test 2: Scenario 1 Complete Flow (Temporary Payment Failure — ₹4,999)
  // =========================================================================
  it("Test 2: Scenario 1 executes end-to-end with high probability (~84%), RETRY_PAYMENT, APPROVED, and INITIATED", async () => {
    const initRes = await initializeDemoCase("temp_failure");
    assert.strictEqual(initRes.success, true);

    const agentResult = await processRecoveryCase(initRes.scenario.orderId, {
      customContext: {
        successfulOrdersCount: initRes.scenario.previousSuccessfulOrders,
        totalOrdersCount: initRes.scenario.totalOrdersCount
      }
    });

    assert.strictEqual(agentResult.success, true);
    assert.strictEqual(agentResult.diagnosis.category, "TEMPORARY_PAYMENT_FAILURE");
    assert.ok(agentResult.diagnosis.confidence >= 0.8, "Confidence must be high");
    assert.strictEqual(agentResult.recoveryProbability, 0.84);
    assert.strictEqual(agentResult.expectedRecovery, 4199.16);
    assert.strictEqual(agentResult.decision.action, "RETRY_PAYMENT");
    assert.strictEqual(agentResult.decision.priority, "HIGH");
    assert.strictEqual(agentResult.policy.allowed, true);
    assert.strictEqual(agentResult.execution.status, "INITIATED");

    // Verify recovery case status progressed to IN_RECOVERY in database
    const { data: updatedCase } = await supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .eq("order_id", initRes.scenario.orderId)
      .maybeSingle();

    assert.strictEqual(updatedCase.recovery_status, "IN_RECOVERY");

    // Verify agent_actions contains audit trail
    const { data: actions } = await supabaseAdmin
      .from("agent_actions")
      .select("*")
      .eq("case_id", updatedCase.id);

    assert.ok(actions && actions.length >= 3, "Audit trail must record multiple agent steps");
    const actionTypes = actions.map((a: any) => a.action_type);
    assert.ok(actionTypes.includes("CASE_ANALYZED"));
    assert.ok(actionTypes.includes("DIAGNOSIS_COMPLETED"));
    assert.ok(actionTypes.includes("RECOVERY_INITIATED"));
  });

  // =========================================================================
  // Test 3: Scenario 2 Complete Flow (Repeated Payment Failure)
  // =========================================================================
  it("Test 3: Scenario 2 executes with lower recovery score and selects SEND_REMINDER", async () => {
    const initRes = await initializeDemoCase("repeat_failure");
    assert.strictEqual(initRes.success, true);

    const agentResult = await processRecoveryCase(initRes.scenario.orderId, {
      customContext: {
        successfulOrdersCount: initRes.scenario.previousSuccessfulOrders,
        totalOrdersCount: initRes.scenario.totalOrdersCount
      }
    });

    assert.strictEqual(agentResult.success, true);
    assert.strictEqual(agentResult.diagnosis.category, "REPEATED_PAYMENT_FAILURE");
    assert.strictEqual(agentResult.decision.action, "SEND_REMINDER");
    assert.strictEqual(agentResult.decision.suggestedChannel, "EMAIL");
    assert.strictEqual(agentResult.policy.allowed, true);
    assert.ok(agentResult.recoveryProbability < 0.6, "Repeated drops must lower recovery probability");
  });

  // =========================================================================
  // Test 4: Scenario 3 Policy Block (High Value Order — ₹18,500 > ₹10,000)
  // =========================================================================
  it("Test 4: Scenario 3 triggers policy safety gate (AMOUNT_EXCEEDS_LIMIT) and skips link creation", async () => {
    const initRes = await initializeDemoCase("high_value");
    assert.strictEqual(initRes.success, true);

    const agentResult = await processRecoveryCase(initRes.scenario.orderId, {
      customContext: {
        successfulOrdersCount: initRes.scenario.previousSuccessfulOrders,
        totalOrdersCount: initRes.scenario.totalOrdersCount
      }
    });

    assert.strictEqual(agentResult.success, true);
    assert.strictEqual(agentResult.policy.allowed, false);
    assert.strictEqual(agentResult.policy.violatedPolicy, "AMOUNT_EXCEEDS_LIMIT");
    assert.strictEqual(agentResult.execution.status, "SKIPPED");
    assert.strictEqual(agentResult.execution.paymentLink, undefined);

    // Case must remain OPEN (not IN_RECOVERY)
    const { data: dbCase } = await supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .eq("order_id", initRes.scenario.orderId)
      .maybeSingle();

    assert.strictEqual(dbCase.recovery_status, "OPEN");
  });

  // =========================================================================
  // Test 5: Scenario 4 Retry Block (Retry Limit Reached >= 2)
  // =========================================================================
  it("Test 5: Scenario 4 blocks automated retry due to MAX_RETRIES_EXCEEDED", async () => {
    const initRes = await initializeDemoCase("retry_limit");
    assert.strictEqual(initRes.success, true);

    const agentResult = await processRecoveryCase(initRes.scenario.orderId);

    assert.strictEqual(agentResult.success, true);
    assert.strictEqual(agentResult.policy.allowed, false);
    assert.strictEqual(agentResult.policy.violatedPolicy, "MAX_RETRIES_EXCEEDED");
    assert.strictEqual(agentResult.execution.status, "SKIPPED");
  });

  // =========================================================================
  // Test 6: Scenario 5 Verified Settlement (OPEN -> IN_RECOVERY -> RECOVERED)
  // =========================================================================
  it("Test 6: Scenario 5 executes full verified lifecycle from OPEN to RECOVERED", async () => {
    const initRes = await initializeDemoCase("settlement");
    assert.strictEqual(initRes.success, true);

    // Step 1: Initial state is OPEN
    assert.strictEqual(initRes.recoveryCase?.recovery_status, "OPEN");

    // Step 2: Trigger recovery agent -> transitions to IN_RECOVERY
    const initialAgentResult = await processRecoveryCase(initRes.scenario.orderId, {
      customContext: {
        successfulOrdersCount: initRes.scenario.previousSuccessfulOrders,
        totalOrdersCount: initRes.scenario.totalOrdersCount
      }
    });
    assert.strictEqual(initialAgentResult.execution.status, "INITIATED");

    const { data: inRecoveryCase } = await supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .eq("order_id", initRes.scenario.orderId)
      .maybeSingle();
    assert.strictEqual(inRecoveryCase.recovery_status, "IN_RECOVERY");

    // Step 3: Simulate signed Razorpay webhook confirmation
    const webhookSecret = "test_webhook_secret_pahadi_ai_2026";
    const webhookEvent = {
      id: "evt_test_settle_001",
      event: "payment_link.paid",
      payload: {
        payment_link: {
          entity: {
            id: "plink_test_settle_001",
            amount: 499900,
            amount_paid: 499900,
            currency: "INR",
            status: "paid",
            notes: {
              case_id: initRes.scenario.caseId,
              internalOrderId: initRes.scenario.orderId,
              order_id: initRes.scenario.orderId,
              source: "pahadi_ai_recovery"
            }
          }
        },
        payment: {
          entity: {
            id: "pay_test_settle_001",
            amount: 499900,
            currency: "INR",
            status: "captured"
          }
        }
      }
    };

    const rawBody = JSON.stringify(webhookEvent);
    const signature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

    const webhookResult = await processRecoveryPaymentWebhook({
      rawBody,
      signature,
      webhookSecret,
      event: webhookEvent
    });

    assert.strictEqual(webhookResult.success, true);
    assert.strictEqual(webhookResult.recoveryProcessed, true);

    // Step 4: Verify database status is now RECOVERED
    const { data: finalCase } = await supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .eq("order_id", initRes.scenario.orderId)
      .maybeSingle();

    assert.strictEqual(finalCase.recovery_status, "RECOVERED");
    assert.ok(finalCase.recovered_at !== null, "recovered_at timestamp must be set");

    // Verify PAYMENT_RECOVERED audit record
    const { data: actions } = await supabaseAdmin
      .from("agent_actions")
      .select("*")
      .eq("case_id", finalCase.id)
      .eq("action_type", "PAYMENT_RECOVERED");

    assert.ok(actions && actions.length >= 1, "PAYMENT_RECOVERED action must be recorded");
  });

  // =========================================================================
  // Test 7: Repeated Scenario Execution (Idempotency)
  // =========================================================================
  it("Test 7: Multiple clicks on the same scenario do not create duplicate cases or corrupt retries", async () => {
    // Run scenario 1 once
    const firstRun = await initializeDemoCase("temp_failure");
    assert.strictEqual(firstRun.success, true);
    await processRecoveryCase(firstRun.scenario.orderId);

    // Run scenario 1 again (simulating repeated user click in Demo Lab)
    const secondRun = await initializeDemoCase("temp_failure");
    assert.strictEqual(secondRun.success, true);
    const secondAgent = await processRecoveryCase(secondRun.scenario.orderId, {
      customContext: { successfulOrdersCount: 3, totalOrdersCount: 3 }
    });

    assert.strictEqual(secondAgent.success, true);
    assert.strictEqual(secondAgent.policy.allowed, true);
    assert.strictEqual(secondAgent.execution.status, "INITIATED");

    // Check that there is only 1 recovery case for this order in the database
    const { data: allCases } = await supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .eq("order_id", "demo-order-temp-001");

    assert.strictEqual(allCases?.length, 1, "Must maintain exactly 1 case without duplicates");
  });

  // =========================================================================
  // Test 8: Demo Data Isolation
  // =========================================================================
  it("Test 8: Demo records are clearly tagged with metadata { source: 'pahadi_ai_demo', demo: true }", async () => {
    const initRes = await initializeDemoCase("temp_failure");
    assert.strictEqual(initRes.success, true);

    const { data: dbCase } = await supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .eq("order_id", "demo-order-temp-001")
      .maybeSingle();

    assert.strictEqual(dbCase.metadata?.source, "pahadi_ai_demo");
    assert.strictEqual(dbCase.metadata?.demo, true);

    const { data: dbEvent } = await supabaseAdmin
      .from("revenue_events")
      .select("*")
      .eq("order_id", "demo-order-temp-001")
      .maybeSingle();

    assert.strictEqual(dbEvent.raw_payload?.source, "pahadi_ai_demo");
    assert.strictEqual(dbEvent.raw_payload?.demo, true);
  });

  // =========================================================================
  // Test 9: Database Insertion Failure Handling
  // =========================================================================
  it("Test 9: Invalid scenario returns structured error with errorCategory", async () => {
    const invalidRes = await initializeDemoCase("invalid_unknown_scenario" as any);

    assert.strictEqual(invalidRes.success, false);
    assert.strictEqual(invalidRes.errorCategory, "INVALID_SCENARIO");
    assert.ok(invalidRes.error?.includes("Unknown scenario"));
    assert.strictEqual(invalidRes.recoveryCase, null);
  });

  // =========================================================================
  // Test 10: Agent is not called when case creation fails
  // =========================================================================
  it("Test 10: Calling agent with non-existent case identifier returns clean failure without crash", async () => {
    const nonExistentId = "non-existent-order-uuid-999999";
    const result = await processRecoveryCase(nonExistentId);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.diagnosis.category, "UNKNOWN_FAILURE");
    assert.strictEqual(result.decision.action, "NO_ACTION");
    assert.strictEqual(result.decision.reason, "Case not found.");
    assert.strictEqual(result.policy.allowed, false);
    assert.strictEqual(result.execution.status, "SKIPPED");
    assert.ok(result.error?.includes("Recovery case not found"));
  });
});

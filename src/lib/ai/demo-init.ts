// src/lib/ai/demo-init.ts
import { supabaseAdmin } from "@/lib/supabase";
import type { DbRecoveryCase, DbRevenueEvent } from "./types";

export type DemoScenarioKey =
  | "temp_failure"
  | "repeat_failure"
  | "high_value"
  | "retry_limit"
  | "settlement";

export interface DemoScenarioDefinition {
  key: DemoScenarioKey;
  title: string;
  description: string;
  expectedSummary: string;
  customerName: string;
  customerId: string;
  customerEmail: string;
  customerPhone: string;
  orderId: string;
  caseId: string;
  eventId: string;
  amount: number;
  currency: string;
  failureReason: string;
  previousSuccessfulOrders: number;
  totalOrdersCount: number;
  initialRetryCount: number;
  cartItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
}

export const DEMO_SCENARIOS: Record<DemoScenarioKey, DemoScenarioDefinition> = {
  temp_failure: {
    key: "temp_failure",
    title: "Temporary Payment Failure — ₹4,999",
    description: "Customer experiences bank timeout. 3 prior purchases boost recovery probability to ~84%.",
    expectedSummary: "Action: RETRY_PAYMENT | Policy: APPROVED | Status: INITIATED",
    customerName: "Test Customer",
    customerId: "demo-customer-001",
    customerEmail: "test.customer@pahadivibes.com",
    customerPhone: "+919876543210",
    orderId: "demo-order-temp-001",
    caseId: "rcase_demo_temp_001",
    eventId: "demo-evt-temp-001",
    amount: 4999,
    currency: "INR",
    failureReason: "Bank network connection timed out during 3D Secure verification",
    previousSuccessfulOrders: 3,
    totalOrdersCount: 3,
    initialRetryCount: 0,
    cartItems: [
      {
        productId: "prod_aipan_01",
        productName: "Handmade Pahadi Aipan Wall Art",
        quantity: 1,
        price: 4999
      }
    ]
  },

  repeat_failure: {
    key: "repeat_failure",
    title: "Repeated Payment Failure",
    description: "Multiple consecutive payment failures reduce immediate retry confidence, routing to recovery reminder.",
    expectedSummary: "Action: SEND_REMINDER | Policy: APPROVED | Channel: EMAIL",
    customerName: "Rahul Verma",
    customerId: "demo-customer-002",
    customerEmail: "rahul.verma@example.com",
    customerPhone: "+919811223344",
    orderId: "demo-order-repeat-001",
    caseId: "rcase_demo_repeat_001",
    eventId: "demo-evt-repeat-001",
    amount: 3500,
    currency: "INR",
    failureReason: "Multiple consecutive payment attempts failed at issuing bank",
    previousSuccessfulOrders: 0,
    totalOrdersCount: 1,
    initialRetryCount: 0,
    cartItems: [
      {
        productId: "prod_kumaon_shawl",
        productName: "Authentic Kumaoni Woolen Shawl",
        quantity: 1,
        price: 3500
      }
    ]
  },

  high_value: {
    key: "high_value",
    title: "High Value Order (₹18,500)",
    description: "Order amount exceeds maximum automatic recovery limit (₹10,000). Safety gate blocks automated recovery.",
    expectedSummary: "Policy: BLOCKED (AMOUNT_EXCEEDS_LIMIT) | Status: SKIPPED",
    customerName: "Vikram Malhotra",
    customerId: "demo-customer-003",
    customerEmail: "vikram.m@example.com",
    customerPhone: "+919988776655",
    orderId: "demo-order-high-001",
    caseId: "rcase_demo_high_001",
    eventId: "demo-evt-high-001",
    amount: 18500,
    currency: "INR",
    failureReason: "Card limit exceeded during high-value transaction",
    previousSuccessfulOrders: 5,
    totalOrdersCount: 5,
    initialRetryCount: 0,
    cartItems: [
      {
        productId: "prod_copper_craft",
        productName: "Masterpiece Himalayan Copper Utensil Collection",
        quantity: 1,
        price: 18500
      }
    ]
  },

  retry_limit: {
    key: "retry_limit",
    title: "Retry Limit Reached",
    description: "Maximum allowable retries (2) already reached. Policy engine blocks automated retry.",
    expectedSummary: "Policy: BLOCKED (MAX_RETRIES_EXCEEDED) | Status: SKIPPED",
    customerName: "Ananya Joshi",
    customerId: "demo-customer-004",
    customerEmail: "ananya.j@example.com",
    customerPhone: "+919877665544",
    orderId: "demo-order-limit-001",
    caseId: "rcase_demo_limit_001",
    eventId: "demo-evt-limit-001",
    amount: 2999,
    currency: "INR",
    failureReason: "Bank network connection timed out during 3D Secure verification",
    previousSuccessfulOrders: 2,
    totalOrdersCount: 2,
    initialRetryCount: 2,
    cartItems: [
      {
        productId: "prod_organic_tea",
        productName: "High-Altitude Uttarakhand Herbal Tea Set",
        quantity: 1,
        price: 2999
      }
    ]
  },

  settlement: {
    key: "settlement",
    title: "Verified Webhook Settlement Simulation",
    description: "Simulates incoming cryptographically signed Razorpay Webhook transitioning case from IN_RECOVERY to RECOVERED.",
    expectedSummary: "Status: RECOVERED | Action: PAYMENT_RECOVERED | Stock Updated",
    customerName: "Sanjay Rawat",
    customerId: "demo-customer-005",
    customerEmail: "sanjay.r@example.com",
    customerPhone: "+919833445566",
    orderId: "demo-order-settle-001",
    caseId: "rcase_demo_settle_001",
    eventId: "demo-evt-settle-001",
    amount: 4999,
    currency: "INR",
    failureReason: "Transient bank error during 3DS",
    previousSuccessfulOrders: 3,
    totalOrdersCount: 3,
    initialRetryCount: 0,
    cartItems: [
      {
        productId: "prod_aipan_temple",
        productName: "Handcrafted Pahadi Temple Wood Carving",
        quantity: 1,
        price: 4999
      }
    ]
  }
};

export interface DemoInitializationResult {
  success: boolean;
  scenario: DemoScenarioDefinition;
  recoveryCase: DbRecoveryCase | null;
  revenueEvent: DbRevenueEvent | null;
  error?: string;
  errorCategory?: string;
}

/**
 * Initializes deterministic demo data for a scenario with idempotency guarantees.
 * Ensures the database contains the exact case and event before the agent runs.
 */
export async function initializeDemoCase(
  scenarioKey: DemoScenarioKey
): Promise<DemoInitializationResult> {
  const scenario = DEMO_SCENARIOS[scenarioKey];
  if (!scenario) {
    return {
      success: false,
      scenario: null as any,
      recoveryCase: null,
      revenueEvent: null,
      error: `Unknown scenario key: ${scenarioKey}`,
      errorCategory: "INVALID_SCENARIO"
    };
  }

  try {
    const now = new Date().toISOString();

    // 1. Idempotency: Clean up previous records for this deterministic order
    await supabaseAdmin
      .from("recovery_cases")
      .delete()
      .eq("order_id", scenario.orderId);

    await supabaseAdmin
      .from("revenue_events")
      .delete()
      .eq("order_id", scenario.orderId);

    // 2. Insert deterministic revenue event
    const eventPayload = {
      event_id: scenario.eventId,
      event_type: "PAYMENT_FAILED",
      order_id: scenario.orderId,
      razorpay_order_id: `rzp_ord_${scenario.orderId.replace(/[^a-zA-Z0-9]/g, "")}`,
      customer_id: scenario.customerId,
      customer_name: scenario.customerName,
      customer_email: scenario.customerEmail,
      customer_phone: scenario.customerPhone,
      amount: scenario.amount,
      currency: scenario.currency,
      status: "RECORDED",
      failure_reason: scenario.failureReason,
      raw_payload: {
        source: "pahadi_ai_demo",
        demo: true,
        is_demo: true,
        scenario: scenario.key
      },
      created_at: now,
      processed_at: now
    };

    const { data: insertedEvent, error: eventError } = await supabaseAdmin
      .from("revenue_events")
      .insert(eventPayload)
      .select()
      .maybeSingle();

    if (eventError) {
      return {
        success: false,
        scenario,
        recoveryCase: null,
        revenueEvent: null,
        error: eventError.message || "Failed to insert demo revenue event",
        errorCategory: "EVENT_INSERT_ERROR"
      };
    }

    // 3. Insert deterministic recovery case
    const casePayload = {
      case_id: scenario.caseId,
      order_id: scenario.orderId,
      razorpay_order_id: `rzp_ord_${scenario.orderId.replace(/[^a-zA-Z0-9]/g, "")}`,
      customer_id: scenario.customerId,
      customer_name: scenario.customerName,
      customer_email: scenario.customerEmail,
      customer_phone: scenario.customerPhone,
      amount: scenario.amount,
      currency: scenario.currency,
      stage: "PAYMENT_FAILED",
      recovery_status: "OPEN",
      failure_reason: scenario.failureReason,
      last_event_id: scenario.eventId,
      cart_items: scenario.cartItems,
      metadata: {
        source: "pahadi_ai_demo",
        demo: true,
        is_demo: true,
        scenario: scenario.key,
        initializationTimestamp: now
      },
      created_at: now,
      updated_at: now,
      recovered_at: null
    };

    const { data: insertedCase, error: caseError } = await supabaseAdmin
      .from("recovery_cases")
      .insert(casePayload)
      .select()
      .maybeSingle();

    if (caseError) {
      return {
        success: false,
        scenario,
        recoveryCase: null,
        revenueEvent: insertedEvent as DbRevenueEvent,
        error: caseError.message || "Failed to insert demo recovery case",
        errorCategory: "CASE_INSERT_ERROR"
      };
    }

    const caseDbId = (insertedCase as DbRecoveryCase)?.id;

    // 4. If scenario requires previous retries (Scenario 4: Retry Limit Reached), insert prior actions
    if (scenario.initialRetryCount > 0 && caseDbId) {
      // Clean up previous actions for this case
      await supabaseAdmin.from("agent_actions").delete().eq("case_id", caseDbId);

      const priorActions = [];
      for (let i = 1; i <= scenario.initialRetryCount; i++) {
        priorActions.push({
          case_id: caseDbId,
          action_type: "RECOVERY_INITIATED",
          channel: "SYSTEM",
          status: "EXECUTED",
          action_payload: { action: "RETRY_PAYMENT", attempt: i },
          reasoning: `Prior Attempt ${i}`,
          executed_at: new Date(Date.now() - (scenario.initialRetryCount - i + 1) * 3600000).toISOString(),
          created_at: new Date(Date.now() - (scenario.initialRetryCount - i + 1) * 3600000).toISOString()
        });
      }

      await supabaseAdmin.from("agent_actions").insert(priorActions);
    }

    // 5. Database Verification: verify case exists before proceeding
    const { data: verifiedCase, error: verifyError } = await supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .eq("order_id", scenario.orderId)
      .maybeSingle();

    if (verifyError || !verifiedCase) {
      return {
        success: false,
        scenario,
        recoveryCase: null,
        revenueEvent: insertedEvent as DbRevenueEvent,
        error: verifyError?.message || "Verification check failed: Recovery case was not found in database after insertion.",
        errorCategory: "DATABASE_VERIFICATION_FAILED"
      };
    }

    return {
      success: true,
      scenario,
      recoveryCase: verifiedCase as DbRecoveryCase,
      revenueEvent: insertedEvent as DbRevenueEvent
    };
  } catch (err: any) {
    return {
      success: false,
      scenario,
      recoveryCase: null,
      revenueEvent: null,
      error: err?.message || "Unexpected exception during demo case initialization",
      errorCategory: "INITIALIZATION_EXCEPTION"
    };
  }
}

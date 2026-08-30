import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { recordRevenueEvent } from "@/lib/ai/revenue-events";
import { processRecoveryCase } from "@/lib/ai/agent";
import { processRecoveryPaymentWebhook } from "@/lib/ai/recovery-executor";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { scenario } = await request.json();
    const timestamp = Date.now();

    switch (scenario) {
      // -------------------------------------------------------------
      // Scenario 1: Temporary Payment Failure (₹4,999, 3 orders)
      // -------------------------------------------------------------
      case "temp_failure": {
        const orderId = `demo-ord-temp-${timestamp.toString(36)}`;
        const eventId = `demo-evt-temp-${timestamp}`;

        // Ingest revenue event
        await recordRevenueEvent({
          eventId,
          eventType: "PAYMENT_FAILED",
          orderId,
          customerId: "demo-cust-001",
          customerName: "Priya Sharma",
          customerEmail: "priya.sharma@example.com",
          customerPhone: "+919876543210",
          amount: 4999,
          currency: "INR",
          failureReason: "Bank network connection timed out during 3D Secure verification",
          rawPayload: { is_demo: true, demo_scenario: "temp_failure" },
          metadata: { is_demo: true }
        });

        // Run Agent Brain Pipeline
        const result = await processRecoveryCase(orderId, {
          customContext: { successfulOrdersCount: 3, totalOrdersCount: 3 }
        });

        return NextResponse.json({
          success: true,
          scenario: "Temporary Payment Failure (₹4,999)",
          description: "High recovery probability with temporary payment failure and loyal customer history.",
          expected: "Action: RETRY_PAYMENT | Policy: APPROVED | Status: INITIATED",
          result
        });
      }

      // -------------------------------------------------------------
      // Scenario 2: Repeated Payment Failure (Multiple attempts)
      // -------------------------------------------------------------
      case "repeat_failure": {
        const orderId = `demo-ord-repeat-${timestamp.toString(36)}`;
        const eventId = `demo-evt-repeat-${timestamp}`;

        await recordRevenueEvent({
          eventId,
          eventType: "PAYMENT_FAILED",
          orderId,
          customerId: "demo-cust-002",
          customerName: "Rahul Verma",
          customerEmail: "rahul.verma@example.com",
          customerPhone: "+919811223344",
          amount: 3500,
          currency: "INR",
          failureReason: "Multiple consecutive payment attempts failed at issuing bank",
          rawPayload: { is_demo: true, demo_scenario: "repeat_failure" },
          metadata: { is_demo: true }
        });

        const result = await processRecoveryCase(orderId, {
          customContext: { successfulOrdersCount: 0, totalOrdersCount: 1 }
        });

        return NextResponse.json({
          success: true,
          scenario: "Repeated Payment Failure",
          description: "Multiple failed attempts reduce immediate retry confidence, routing to recovery reminder.",
          expected: "Action: SEND_REMINDER | Policy: APPROVED | Channel: EMAIL",
          result
        });
      }

      // -------------------------------------------------------------
      // Scenario 3: High Value Order (₹18,500 > ₹10,000 limit)
      // -------------------------------------------------------------
      case "high_value": {
        const orderId = `demo-ord-high-${timestamp.toString(36)}`;
        const eventId = `demo-evt-high-${timestamp}`;

        await recordRevenueEvent({
          eventId,
          eventType: "PAYMENT_FAILED",
          orderId,
          customerId: "demo-cust-003",
          customerName: "Vikram Malhotra",
          customerEmail: "vikram.m@example.com",
          amount: 18500,
          currency: "INR",
          failureReason: "Card limit exceeded during high-value transaction",
          rawPayload: { is_demo: true, demo_scenario: "high_value" },
          metadata: { is_demo: true }
        });

        const result = await processRecoveryCase(orderId, {
          customContext: { successfulOrdersCount: 5 }
        });

        return NextResponse.json({
          success: true,
          scenario: "High Value Order (₹18,500)",
          description: "Order amount exceeds maximum automatic recovery limit (₹10,000). Safety gate blocks automated recovery.",
          expected: "Policy: BLOCKED (AMOUNT_EXCEEDS_LIMIT) | Status: SKIPPED",
          result
        });
      }

      // -------------------------------------------------------------
      // Scenario 4: Retry Limit Exceeded (>= 2 retries already attempted)
      // -------------------------------------------------------------
      case "retry_limit": {
        const orderId = `demo-ord-limit-${timestamp.toString(36)}`;
        const eventId = `demo-evt-limit-${timestamp}`;

        const caseRes = await recordRevenueEvent({
          eventId,
          eventType: "PAYMENT_FAILED",
          orderId,
          customerId: "demo-cust-004",
          customerName: "Ananya Joshi",
          customerEmail: "ananya.j@example.com",
          amount: 2999,
          currency: "INR",
          failureReason: "Payment cancelled by user",
          rawPayload: { is_demo: true, demo_scenario: "retry_limit" },
          metadata: { is_demo: true }
        });

        // Insert 2 prior retry actions into agent_actions
        if (caseRes.recoveryCase) {
          const now = new Date().toISOString();
          await supabaseAdmin.from("agent_actions").insert([
            {
              case_id: caseRes.recoveryCase.id,
              action_type: "RECOVERY_INITIATED",
              channel: "SYSTEM",
              status: "EXECUTED",
              action_payload: { action: "RETRY_PAYMENT" },
              reasoning: "Prior Attempt 1",
              executed_at: now,
              created_at: now
            },
            {
              case_id: caseRes.recoveryCase.id,
              action_type: "RECOVERY_INITIATED",
              channel: "SYSTEM",
              status: "EXECUTED",
              action_payload: { action: "RETRY_PAYMENT" },
              reasoning: "Prior Attempt 2",
              executed_at: now,
              created_at: now
            }
          ]);
        }

        const result = await processRecoveryCase(orderId);

        return NextResponse.json({
          success: true,
          scenario: "Retry Limit Exceeded",
          description: "Maximum allowable retries (2) already reached. Policy engine blocks automated retry.",
          expected: "Policy: BLOCKED (MAX_RETRIES_EXCEEDED) | Status: SKIPPED",
          result
        });
      }

      // -------------------------------------------------------------
      // Scenario 5: Verified Webhook Settlement Simulation
      // -------------------------------------------------------------
      case "settlement": {
        const orderId = `demo-ord-settle-${timestamp.toString(36)}`;
        const eventId = `demo-evt-settle-${timestamp}`;
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "pahadivibes_webhook_secret_2026";

        // 1. Ingest failed payment case
        const initialCase = await recordRevenueEvent({
          eventId,
          eventType: "PAYMENT_FAILED",
          orderId,
          customerId: "demo-cust-005",
          customerName: "Sanjay Rawat",
          customerEmail: "sanjay.r@example.com",
          amount: 4999,
          currency: "INR",
          failureReason: "Transient bank error",
          rawPayload: { is_demo: true, demo_scenario: "settlement" },
          metadata: { is_demo: true }
        });

        // 2. Trigger initial agent recovery workflow
        await processRecoveryCase(orderId);

        // 3. Simulate signed Razorpay Webhook confirmation
        const webhookEvent = {
          id: `evt_rzp_demo_${timestamp}`,
          event: "payment_link.paid",
          payload: {
            payment_link: {
              entity: {
                id: `plink_demo_${timestamp.toString(36)}`,
                amount: 499900,
                amount_paid: 499900,
                currency: "INR",
                status: "paid",
                notes: {
                  case_id: initialCase.recoveryCase?.case_id,
                  internalOrderId: orderId,
                  order_id: orderId,
                  source: "pahadi_ai_recovery"
                }
              }
            },
            payment: {
              entity: {
                id: `pay_demo_${timestamp.toString(36)}`,
                amount: 499900,
                currency: "INR",
                status: "captured"
              }
            }
          }
        };

        const rawBody = JSON.stringify(webhookEvent);
        const signature = crypto
          .createHmac("sha256", webhookSecret)
          .update(rawBody)
          .digest("hex");

        const webhookResult = await processRecoveryPaymentWebhook({
          rawBody,
          signature,
          webhookSecret,
          event: webhookEvent
        });

        return NextResponse.json({
          success: true,
          scenario: "Verified Webhook Settlement Simulation",
          description: "Simulates cryptographic Razorpay webhook verification transitioning case from IN_RECOVERY to RECOVERED.",
          expected: "Status: RECOVERED | Action: PAYMENT_RECOVERED | Stock Updated",
          result: {
            orderId,
            caseId: initialCase.recoveryCase?.case_id,
            webhookResult
          }
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown scenario: ${scenario}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("POST /api/admin/pahadi-ai/demo error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Demo execution failure" },
      { status: 500 }
    );
  }
}

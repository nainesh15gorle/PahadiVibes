// src/lib/ai/recovery-executor.ts
import type {
  AgentActionChannel,
  ExecutionResult,
  RecoveryExecutionInput
} from "./types";

/**
 * Recovery Executor for Pahadi AI
 *
 * Executes ONLY actions that have already been validated and approved by the Policy Engine.
 *
 * SAFETY INVARIANTS:
 * - NEVER performs direct card charging.
 * - NEVER bypasses the policy engine.
 * - Adheres strictly to standard e-commerce recovery mechanisms (payment retry initiation,
 *   customer notification / payment link reminders).
 */
export async function executeRecoveryAction(
  input: RecoveryExecutionInput
): Promise<ExecutionResult> {
  const { recoveryCase, decision, policy } = input;

  // 1. Safety Check: Verify Policy Approval
  if (!policy.allowed) {
    return {
      success: false,
      status: "SKIPPED",
      actionType: decision.action,
      channel: "SYSTEM",
      executionDetails: {
        reason: "Execution blocked: Policy evaluation was not approved.",
        violatedPolicy: policy.violatedPolicy
      },
      error: policy.reason
    };
  }

  try {
    switch (decision.action) {
      case "RETRY_PAYMENT": {
        // Prepare compliant payment retry workflow
        const retrySession = {
          orderId: recoveryCase.order_id,
          razorpayOrderId: recoveryCase.razorpay_order_id,
          amountPaise: Math.round(Number(recoveryCase.amount) * 100),
          currency: recoveryCase.currency || "INR",
          customerEmail: recoveryCase.customer_email,
          customerPhone: recoveryCase.customer_phone,
          retryUrl: `/cart?resumeOrderId=${encodeURIComponent(recoveryCase.order_id)}`,
          initiatedAt: new Date().toISOString()
        };

        return {
          success: true,
          status: "INITIATED",
          actionType: "RETRY_PAYMENT",
          channel: "SYSTEM",
          executionDetails: {
            workflow: "PAYMENT_RETRY_INITIATED",
            retrySession,
            message: `Initiated seamless payment retry for order ${recoveryCase.order_id}.`
          }
        };
      }

      case "SEND_REMINDER": {
        const channel: AgentActionChannel = recoveryCase.customer_email
          ? "EMAIL"
          : recoveryCase.customer_phone
          ? "SMS"
          : "SYSTEM";

        const reminderPayload = {
          orderId: recoveryCase.order_id,
          customerName: recoveryCase.customer_name || "Valued Customer",
          recipient: recoveryCase.customer_email || recoveryCase.customer_phone || "customer",
          amount: recoveryCase.amount,
          currency: recoveryCase.currency || "INR",
          cartItemsCount: Array.isArray(recoveryCase.cart_items) ? recoveryCase.cart_items.length : 0,
          paymentLink: `/cart?resumeOrderId=${encodeURIComponent(recoveryCase.order_id)}`,
          scheduledAt: new Date().toISOString()
        };

        return {
          success: true,
          status: "INITIATED",
          actionType: "SEND_REMINDER",
          channel,
          executionDetails: {
            workflow: "REMINDER_QUEUED",
            reminderPayload,
            message: `Recovery reminder scheduled for ${reminderPayload.recipient} via ${channel}.`
          }
        };
      }

      case "NO_ACTION":
      default: {
        return {
          success: true,
          status: "SKIPPED",
          actionType: "NO_ACTION",
          channel: "SYSTEM",
          executionDetails: {
            workflow: "NO_ACTION_RECORDED",
            reason: decision.reason
          }
        };
      }
    }
  } catch (error: any) {
    console.error("Pahadi AI [executeRecoveryAction error]:", error);
    return {
      success: false,
      status: "FAILED",
      actionType: decision.action,
      channel: "SYSTEM",
      executionDetails: {
        error: error?.message || "Execution failed unexpectedly"
      },
      error: error?.message || "Execution failure"
    };
  }
}

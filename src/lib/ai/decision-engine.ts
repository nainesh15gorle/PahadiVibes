// src/lib/ai/decision-engine.ts
import type {
  ActionPriority,
  DecisionEngineInput,
  RecoveryActionType,
  RecoveryDecision
} from "./types";

/**
 * Decision Engine for Pahadi AI
 *
 * Receives revenue event diagnosis, recovery score, and customer context,
 * and selects ONE optimal, high-confidence recovery action.
 *
 * Actions:
 * - RETRY_PAYMENT: For high-probability temporary payment failures with remaining retries.
 * - SEND_REMINDER: For abandoned checkouts or moderate recovery probabilities.
 * - NO_ACTION: For non-recoverable errors or when retry limits are exceeded.
 */
export function selectRecoveryAction(
  input: DecisionEngineInput
): RecoveryDecision {
  const {
    diagnosis,
    recoveryProbability,
    expectedRecovery,
    previousAttemptsCount = 0
  } = input;

  // 1. Determine priority based on expected recovery value
  let priority: ActionPriority = "LOW";
  if (expectedRecovery >= 8000) {
    priority = "CRITICAL";
  } else if (expectedRecovery >= 2500) {
    priority = "HIGH";
  } else if (expectedRecovery >= 1000) {
    priority = "MEDIUM";
  } else {
    priority = "LOW";
  }

  // 2. Rule 1: Permanently non-recoverable or probability <= 0.10
  if (diagnosis.category === "NON_RECOVERABLE" || recoveryProbability <= 0.10) {
    return {
      action: "NO_ACTION",
      priority: "LOW",
      expectedRecovery,
      reason: "No recovery action selected: Order failure is non-recoverable or probability is below threshold.",
      suggestedChannel: "SYSTEM"
    };
  }

  // 3. Rule 2: Temporary payment failure with high probability (>= 0.60) -> RETRY_PAYMENT
  // Note: If retry limits are reached, the Policy Engine (Financial Safety Gate) strictly blocks execution with MAX_RETRIES_EXCEEDED
  if (
    diagnosis.category === "TEMPORARY_PAYMENT_FAILURE" &&
    recoveryProbability >= 0.60
  ) {
    return {
      action: "RETRY_PAYMENT",
      priority,
      expectedRecovery,
      reason: "High recovery probability combined with temporary payment failure and strong customer history.",
      suggestedChannel: "SYSTEM"
    };
  }

  // 4. Rule 3: Max attempts already reached at decision time for other categories
  if (previousAttemptsCount >= 2) {
    return {
      action: "NO_ACTION",
      priority: "LOW",
      expectedRecovery,
      reason: `No recovery action selected: Maximum retry attempts (${previousAttemptsCount}) reached.`,
      suggestedChannel: "SYSTEM"
    };
  }

  // 5. Rule 4: Checkout abandonment or moderate recovery score (0.30 - 0.59) -> SEND_REMINDER
  if (
    diagnosis.category === "CUSTOMER_ABANDONMENT" ||
    diagnosis.category === "REPEATED_PAYMENT_FAILURE" ||
    (recoveryProbability >= 0.30 && recoveryProbability < 0.60)
  ) {
    return {
      action: "SEND_REMINDER",
      priority,
      expectedRecovery,
      reason: "Customer drop-off or moderate recovery probability diagnosed. Recovery reminder recommended.",
      suggestedChannel: "EMAIL"
    };
  }

  // 6. Default fallback: NO_ACTION
  return {
    action: "NO_ACTION",
    priority: "LOW",
    expectedRecovery,
    reason: "No suitable automated recovery strategy met confidence criteria.",
    suggestedChannel: "SYSTEM"
  };
}

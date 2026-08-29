// src/lib/ai/policy-engine.ts
import type {
  PolicyEvaluationInput,
  PolicyEvaluationResult,
  RecoveryPolicyConfig
} from "./types";

export const DEFAULT_RECOVERY_POLICY: RecoveryPolicyConfig = {
  automaticRecoveryEnabled: true,
  maxRetryAttempts: 2,
  maxAutomaticRecoveryAmount: 10000,
  minRecoveryProbabilityThreshold: 0.10
};

/**
 * Policy Engine for Pahadi AI (Financial Safety Gate)
 *
 * CRITICAL SAFETY LAYER:
 * Evaluates decisions against strict risk limits before any execution occurs.
 * No action can proceed without passing all policy guardrails.
 */
export function evaluatePolicy(
  input: PolicyEvaluationInput
): PolicyEvaluationResult {
  const {
    action,
    amount,
    retryCount = 0,
    recoveryStatus,
    recoveryProbability = 1.0,
    config: customConfig
  } = input;

  const policyConfig: RecoveryPolicyConfig = {
    ...DEFAULT_RECOVERY_POLICY,
    ...customConfig
  };

  // 1. Check if NO_ACTION is explicitly passed
  if (action === "NO_ACTION") {
    return {
      allowed: true,
      reason: "NO_ACTION approved: No automated financial or outreach action requested.",
      policyConfig
    };
  }

  // 2. Check if automatic recovery is enabled globally
  if (!policyConfig.automaticRecoveryEnabled) {
    return {
      allowed: false,
      reason: "Automatic recovery is currently disabled by system policy.",
      violatedPolicy: "AUTOMATIC_RECOVERY_DISABLED",
      policyConfig
    };
  }

  // 3. Check if the case is already recovered
  if (recoveryStatus === "RECOVERED") {
    return {
      allowed: false,
      reason: "Case is already recovered. No further action permitted.",
      violatedPolicy: "ALREADY_RECOVERED",
      policyConfig
    };
  }

  // 4. Check if the case has been dismissed
  if (recoveryStatus === "DISMISSED") {
    return {
      allowed: false,
      reason: "Case is marked as dismissed. Automatic recovery is prohibited.",
      violatedPolicy: "CASE_DISMISSED",
      policyConfig
    };
  }

  // 5. Check order amount validity and limits
  if (amount <= 0) {
    return {
      allowed: false,
      reason: "Order amount must be greater than zero for recovery.",
      violatedPolicy: "INVALID_AMOUNT",
      policyConfig
    };
  }

  if (amount > policyConfig.maxAutomaticRecoveryAmount) {
    return {
      allowed: false,
      reason: `Order amount (₹${amount.toLocaleString("en-IN")}) exceeds maximum automatic recovery limit of ₹${policyConfig.maxAutomaticRecoveryAmount.toLocaleString("en-IN")}. Manual approval required.`,
      violatedPolicy: "AMOUNT_EXCEEDS_LIMIT",
      policyConfig
    };
  }

  // 6. Check retry attempt limit
  if (action === "RETRY_PAYMENT" && retryCount >= policyConfig.maxRetryAttempts) {
    return {
      allowed: false,
      reason: "Maximum retry attempts reached.",
      violatedPolicy: "MAX_RETRIES_EXCEEDED",
      policyConfig
    };
  }

  // 7. Check minimum probability threshold
  if (
    policyConfig.minRecoveryProbabilityThreshold &&
    recoveryProbability < policyConfig.minRecoveryProbabilityThreshold
  ) {
    return {
      allowed: false,
      reason: `Recovery probability (${recoveryProbability}) is below policy threshold (${policyConfig.minRecoveryProbabilityThreshold}).`,
      violatedPolicy: "PROBABILITY_BELOW_THRESHOLD",
      policyConfig
    };
  }

  // 8. All safety policies satisfied
  return {
    allowed: true,
    reason: "All recovery policies satisfied.",
    policyConfig
  };
}

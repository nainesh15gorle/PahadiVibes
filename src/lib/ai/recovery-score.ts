// src/lib/ai/recovery-score.ts
import type {
  RecoveryScoreInput,
  RecoveryScoreResult,
  ScoreFactor
} from "./types";

/**
 * Deterministic & Explainable Recovery Scoring Engine
 *
 * Calculates the statistical probability of recovering a drop-off/failed order
 * based on deterministic diagnostic factors, customer purchase history,
 * and previous recovery attempt counts.
 *
 * DO NOT train ML models or fabricate non-deterministic statistical data.
 */
export function calculateRecoveryScore(
  input: RecoveryScoreInput
): RecoveryScoreResult {
  const {
    amount = 0,
    diagnosis,
    customerSuccessfulOrders = 0,
    previousRecoveryAttempts = 0,
    isRepeatedFailure = false
  } = input;

  const factors: ScoreFactor[] = [];
  let baseScore = 0.0;

  // 1. Base score by failure classification
  switch (diagnosis.category) {
    case "TEMPORARY_PAYMENT_FAILURE":
      baseScore = 0.75;
      factors.push({
        factor: "Failure Type",
        impact: "POSITIVE",
        weight: 0.75,
        description: "Temporary payment failure is highly recoverable with a seamless retry."
      });
      break;
    case "CUSTOMER_ABANDONMENT":
      baseScore = 0.50;
      factors.push({
        factor: "Failure Type",
        impact: "NEUTRAL",
        weight: 0.50,
        description: "Cart/modal abandonment indicates moderate recovery likelihood via reminders."
      });
      break;
    case "REPEATED_PAYMENT_FAILURE":
      baseScore = 0.35;
      factors.push({
        factor: "Failure Type",
        impact: "NEGATIVE",
        weight: 0.35,
        description: "Multiple failed attempts reduce probability of immediate recovery."
      });
      break;
    case "UNKNOWN_FAILURE":
      baseScore = 0.40;
      factors.push({
        factor: "Failure Type",
        impact: "NEUTRAL",
        weight: 0.40,
        description: "Unspecified failure reason requires standard follow-up."
      });
      break;
    case "NON_RECOVERABLE":
      baseScore = 0.0;
      factors.push({
        factor: "Failure Type",
        impact: "NEGATIVE",
        weight: 0.0,
        description: "Permanent bank/fraud rejection cannot be automatically recovered."
      });
      break;
  }

  // If non-recoverable, probability is strictly 0.0
  if (diagnosis.category === "NON_RECOVERABLE") {
    return {
      recoveryProbability: 0.0,
      expectedRecovery: 0,
      factors,
      reasoning: "Order is non-recoverable due to permanent rejection flags."
    };
  }

  let finalProbability = baseScore;

  // 2. Customer Order History Impact (+0.03 per successful order up to +0.09)
  if (customerSuccessfulOrders > 0) {
    const historyBonus = Math.min(0.09, customerSuccessfulOrders * 0.03);
    finalProbability += historyBonus;
    factors.push({
      factor: "Customer Loyalty History",
      impact: "POSITIVE",
      weight: historyBonus,
      description: `Customer has ${customerSuccessfulOrders} prior successful purchase(s), increasing recovery confidence (+${Math.round(historyBonus * 100)}%).`
    });
  } else {
    factors.push({
      factor: "Customer Loyalty History",
      impact: "NEUTRAL",
      weight: 0,
      description: "First-time customer with no prior purchase baseline."
    });
  }

  // 3. Repeated Failure / Prior Attempt Penalty
  if (previousRecoveryAttempts > 0) {
    const attemptPenalty = Math.min(0.30, previousRecoveryAttempts * 0.15);
    finalProbability -= attemptPenalty;
    factors.push({
      factor: "Previous Recovery Attempts",
      impact: "NEGATIVE",
      weight: -attemptPenalty,
      description: `${previousRecoveryAttempts} previous recovery attempt(s) without completion (-${Math.round(attemptPenalty * 100)}%).`
    });
  }

  if (isRepeatedFailure && previousRecoveryAttempts === 0) {
    finalProbability -= 0.10;
    factors.push({
      factor: "Repeated Failure Indicator",
      impact: "NEGATIVE",
      weight: -0.10,
      description: "Repeated checkout failure reduces immediate conversion probability (-10%)."
    });
  }

  // 4. Normalization and Expected Recovery Calculation
  finalProbability = Math.max(0.0, Math.min(1.0, finalProbability));
  const roundedProbability = Math.round(finalProbability * 100) / 100;
  const rawExpected = Number(amount) * roundedProbability;
  const expectedRecovery = Math.round(rawExpected * 100) / 100;

  const reasoning = `Estimated ${Math.round(roundedProbability * 100)}% recovery probability for ₹${amount.toLocaleString("en-IN")} order. Expected revenue recovery: ₹${expectedRecovery.toLocaleString("en-IN")}.`;

  return {
    recoveryProbability: roundedProbability,
    expectedRecovery,
    factors,
    reasoning
  };
}

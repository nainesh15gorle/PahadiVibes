// src/lib/ai/diagnosis.ts
import type {
  DbRevenueEvent,
  DiagnosisContext,
  DiagnosisResult
} from "./types";

/**
 * Diagnosis Engine for Pahadi AI
 *
 * Analyzes revenue events (such as PAYMENT_FAILED, MODAL_DISMISSED, ORDER_ABANDONED)
 * to categorize the nature of the drop-off with confidence and explainability.
 *
 * SAFETY INVARIANT: This module is strictly read-only and analytical.
 * It NEVER executes any financial or payment action.
 */
export function diagnoseRevenueEvent(
  event?: DbRevenueEvent | null,
  context?: DiagnosisContext
): DiagnosisResult {
  if (!event) {
    return {
      category: "UNKNOWN_FAILURE",
      confidence: 0.2,
      reason: "No revenue event data provided for diagnosis.",
      isRecoverable: false,
      suggestedPath: "LOG_FOR_MANUAL_REVIEW"
    };
  }

  const { event_type, failure_reason } = event;
  const failureText = (failure_reason || "").toLowerCase();
  const successfulPastOrders = context?.customerSuccessfulOrdersCount ?? 0;
  const previousAttempts = context?.previousAttemptsCount ?? 0;
  const isRepeat = context?.isRepeatFailure || previousAttempts >= 2;

  // 1. Check for permanently non-recoverable payment failures
  const nonRecoverableKeywords = [
    "fraud",
    "blacklisted",
    "stolen_card",
    "card_declined_fraud",
    "lost_card",
    "pickup_card",
    "restricted_card",
    "account_closed",
    "invalid_account",
    "do_not_honor_permanent"
  ];

  if (nonRecoverableKeywords.some((keyword) => failureText.includes(keyword))) {
    return {
      category: "NON_RECOVERABLE",
      confidence: 0.95,
      reason: "Payment declined permanently due to fraud security flags or closed card account.",
      isRecoverable: false,
      suggestedPath: "NO_ACTION"
    };
  }

  // 2. Check for repeated failures
  if (
    isRepeat ||
    failureText.includes("multiple attempts") ||
    failureText.includes("too many attempts") ||
    failureText.includes("repeated payment failure") ||
    failureText.includes("repeated failure") ||
    (failureText.includes("multiple") && failureText.includes("attempts"))
  ) {
    return {
      category: "REPEATED_PAYMENT_FAILURE",
      confidence: 0.88,
      reason: `Customer experienced multiple consecutive payment failures (${previousAttempts} previous attempts recorded).`,
      isRecoverable: true,
      suggestedPath: "SEND_REMINDER_WITH_ASSISTANCE"
    };
  }

  // 3. Check for checkout / cart abandonment
  if (event_type === "MODAL_DISMISSED" || event_type === "ORDER_ABANDONED") {
    return {
      category: "CUSTOMER_ABANDONMENT",
      confidence: 0.85,
      reason: "Customer initiated checkout and dismissed payment modal or abandoned order before completion.",
      isRecoverable: true,
      suggestedPath: "SEND_REMINDER"
    };
  }

  // 4. Handle PAYMENT_FAILED events
  if (event_type === "PAYMENT_FAILED") {
    const temporaryKeywords = [
      "timeout",
      "timed out",
      "bank_server",
      "network",
      "gateway",
      "otp",
      "insufficient_funds",
      "temporary",
      "try again",
      "processing_error",
      "system_error",
      "signature mismatch",
      "bank connectivity",
      "issuer_unavailable",
      "cancelled by user",
      "user dropped",
      "gateway error"
    ];

    const hasTemporaryKeyword = temporaryKeywords.some((kw) => failureText.includes(kw));

    if (successfulPastOrders > 0) {
      return {
        category: "TEMPORARY_PAYMENT_FAILURE",
        confidence: hasTemporaryKeyword ? 0.91 : 0.85,
        reason: "Customer has previous successful purchases and the payment failure appears temporary.",
        isRecoverable: true,
        suggestedPath: "RETRY_PAYMENT"
      };
    }

    if (hasTemporaryKeyword) {
      return {
        category: "TEMPORARY_PAYMENT_FAILURE",
        confidence: 0.82,
        reason: `Payment failure diagnosed as transient gateway or bank issue (${failure_reason || "Temporary network issue"}).`,
        isRecoverable: true,
        suggestedPath: "RETRY_PAYMENT"
      };
    }

    // Generic failure reason provided
    if (failure_reason && failure_reason.trim().length > 0) {
      return {
        category: "TEMPORARY_PAYMENT_FAILURE",
        confidence: 0.75,
        reason: `Payment failed with reason: "${failure_reason}". Likely recoverable with payment retry or alternative method.`,
        isRecoverable: true,
        suggestedPath: "RETRY_PAYMENT"
      };
    }

    return {
      category: "UNKNOWN_FAILURE",
      confidence: 0.6,
      reason: "Payment failed without specific gateway error message.",
      isRecoverable: true,
      suggestedPath: "SEND_REMINDER"
    };
  }

  // Default fallback for other incomplete revenue event states
  return {
    category: "UNKNOWN_FAILURE",
    confidence: 0.5,
    reason: `Event type ${event_type} indicates incomplete revenue collection.`,
    isRecoverable: true,
    suggestedPath: "SEND_REMINDER"
  };
}

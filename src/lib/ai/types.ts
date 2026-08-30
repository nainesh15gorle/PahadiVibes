// src/lib/ai/types.ts

export type RevenueEventType =
  | "ORDER_CREATED"
  | "PAYMENT_PENDING"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "MODAL_DISMISSED"
  | "ORDER_ABANDONED"
  | "REFUND_PROCESSED";

export type RecoveryCaseStatus =
  | "OPEN"
  | "IN_RECOVERY"
  | "RECOVERED"
  | "LOST"
  | "DISMISSED";

export type RecoveryCaseStage =
  | "CHECKOUT_INITIATED"
  | "GATEWAY_PENDING"
  | "PAYMENT_FAILED"
  | "ABANDONED";

export type AgentActionType =
  | "EVENT_CAPTURED"
  | "PAYMENT_FAILURE_CAPTURED"
  | "PAYMENT_COMPLETED"
  | "CASE_INITIALIZED"
  | "MANUAL_NOTE"
  | "CASE_ANALYZED"
  | "DIAGNOSIS_COMPLETED"
  | "RECOVERY_SCORE_CALCULATED"
  | "RECOVERY_ACTION_SELECTED"
  | "POLICY_APPROVED"
  | "POLICY_BLOCKED"
  | "RECOVERY_INITIATED"
  | "RECOVERY_COMPLETED"
  | "PAYMENT_RECOVERED"
  | "RECOVERY_FAILED";

export type AgentActionChannel =
  | "SYSTEM"
  | "WHATSAPP"
  | "SMS"
  | "EMAIL"
  | "ADMIN";

export type AgentActionStatus =
  | "RECORDED"
  | "QUEUED"
  | "EXECUTED"
  | "FAILED"
  | "CANCELLED";

export type FailureCategory =
  | "TEMPORARY_PAYMENT_FAILURE"
  | "REPEATED_PAYMENT_FAILURE"
  | "CUSTOMER_ABANDONMENT"
  | "UNKNOWN_FAILURE"
  | "NON_RECOVERABLE";

export type RecoveryActionType =
  | "RETRY_PAYMENT"
  | "SEND_REMINDER"
  | "NO_ACTION";

export type ActionPriority =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export interface DbRevenueEvent {
  id: string;
  event_id: string;
  event_type: RevenueEventType;
  order_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  amount: number;
  currency: string;
  status: "RECORDED" | "PROCESSED" | "FAILED";
  failure_reason: string | null;
  raw_payload: any;
  created_at: string;
  processed_at: string | null;
}

export interface DbRecoveryCase {
  id: string;
  case_id: string;
  order_id: string;
  razorpay_order_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  amount: number;
  currency: string;
  stage: RecoveryCaseStage;
  recovery_status: RecoveryCaseStatus;
  failure_reason: string | null;
  last_event_id: string | null;
  cart_items: any[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  recovered_at: string | null;
}

export interface DbAgentAction {
  id: string;
  case_id: string;
  action_type: AgentActionType;
  channel: AgentActionChannel;
  status: AgentActionStatus;
  action_payload: Record<string, any>;
  reasoning: string | null;
  executed_at: string | null;
  created_at: string;
}

export interface RecordRevenueEventInput {
  eventId?: string; // Optional custom idempotency key; auto-generated if omitted
  eventType: RevenueEventType;
  orderId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  amount?: number;
  currency?: string;
  failureReason?: string | null;
  cartItems?: any[];
  rawPayload?: any;
  metadata?: Record<string, any>;
}

export interface RecordRevenueEventResult {
  success: boolean;
  isDuplicate: boolean;
  event: DbRevenueEvent | null;
  recoveryCase: DbRecoveryCase | null;
  action: DbAgentAction | null;
  error?: string;
}

// ----------------------------------------------------
// Agent Brain Interfaces
// ----------------------------------------------------

export interface DiagnosisContext {
  previousAttemptsCount?: number;
  previousEvents?: DbRevenueEvent[];
  customerPreviousOrdersCount?: number;
  customerSuccessfulOrdersCount?: number;
  isRepeatFailure?: boolean;
}

export interface DiagnosisResult {
  category: FailureCategory;
  confidence: number; // 0.0 to 1.0
  reason: string;
  isRecoverable: boolean;
  suggestedPath?: string;
}

export interface ScoreFactor {
  factor: string;
  impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  weight: number;
  description: string;
}

export interface RecoveryScoreInput {
  amount: number;
  diagnosis: DiagnosisResult;
  customerPreviousOrders?: number;
  customerSuccessfulOrders?: number;
  previousRecoveryAttempts?: number;
  isRepeatedFailure?: boolean;
  lastFailureTime?: string | Date;
}

export interface RecoveryScoreResult {
  recoveryProbability: number; // 0.00 to 1.00
  expectedRecovery: number;    // amount * recoveryProbability
  factors: ScoreFactor[];
  reasoning: string;
}

export interface CustomerContext {
  customerId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  totalOrdersCount?: number;
  successfulOrdersCount?: number;
  totalSpent?: number;
}

export interface DecisionEngineInput {
  revenueEvent?: DbRevenueEvent | null;
  recoveryCase?: DbRecoveryCase | null;
  diagnosis: DiagnosisResult;
  recoveryProbability: number;
  expectedRecovery: number;
  customerContext?: CustomerContext;
  previousAttemptsCount?: number;
}

export interface RecoveryDecision {
  action: RecoveryActionType;
  priority: ActionPriority;
  expectedRecovery: number;
  reason: string;
  suggestedChannel?: AgentActionChannel;
}

export interface RecoveryPolicyConfig {
  automaticRecoveryEnabled: boolean;
  maxRetryAttempts: number;
  maxAutomaticRecoveryAmount: number;
  minRecoveryProbabilityThreshold?: number;
}

export interface PolicyEvaluationInput {
  action: RecoveryActionType;
  amount: number;
  retryCount: number;
  recoveryStatus: RecoveryCaseStatus;
  recoveryProbability?: number;
  caseId?: string;
  config?: Partial<RecoveryPolicyConfig>;
  previousActions?: DbAgentAction[];
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason: string;
  violatedPolicy?: string;
  policyConfig: RecoveryPolicyConfig;
}

export interface RecoveryExecutionInput {
  recoveryCase: DbRecoveryCase;
  revenueEvent?: DbRevenueEvent | null;
  decision: RecoveryDecision;
  policy: PolicyEvaluationResult;
}

export interface ExecutionResult {
  success: boolean;
  status: "INITIATED" | "COMPLETED" | "SKIPPED" | "FAILED";
  actionType: RecoveryActionType;
  channel: AgentActionChannel;
  executionDetails: Record<string, any>;
  error?: string;
  paymentLink?: {
    id: string;
    shortUrl: string;
    amount: number;
    currency: string;
    status: string;
    expiresAt?: string;
  };
}

export interface AgentExecutionOptions {
  policyConfig?: Partial<RecoveryPolicyConfig>;
  skipExecution?: boolean; // Dry-run mode for simulation / scoring analysis
  customContext?: Partial<CustomerContext>;
}

export interface AgentProcessResult {
  success: boolean;
  caseId: string;
  orderId?: string;
  eventId?: string;
  diagnosis: DiagnosisResult;
  recoveryProbability: number;
  expectedRecovery: number;
  scoreFactors: ScoreFactor[];
  decision: RecoveryDecision;
  policy: PolicyEvaluationResult;
  execution: ExecutionResult;
  auditActionsRecorded: string[];
  error?: string;
}

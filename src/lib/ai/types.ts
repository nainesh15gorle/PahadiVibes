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
  | "MANUAL_NOTE";

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

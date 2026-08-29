// src/lib/ai/agent.ts
import { supabaseAdmin } from "@/lib/supabase";
import type {
  AgentActionChannel,
  AgentActionType,
  AgentExecutionOptions,
  AgentProcessResult,
  CustomerContext,
  DbAgentAction,
  DbRecoveryCase,
  DbRevenueEvent,
  DiagnosisContext,
  DiagnosisResult,
  ExecutionResult,
  PolicyEvaluationResult,
  RecoveryDecision
} from "./types";
import { diagnoseRevenueEvent } from "./diagnosis";
import { calculateRecoveryScore } from "./recovery-score";
import { selectRecoveryAction } from "./decision-engine";
import { evaluatePolicy, DEFAULT_RECOVERY_POLICY } from "./policy-engine";
import { executeRecoveryAction } from "./recovery-executor";

/**
 * Helper to record an agent action to Supabase with non-blocking error handling
 */
async function recordAuditAction(params: {
  caseDbId: string;
  actionType: AgentActionType;
  channel?: AgentActionChannel;
  status?: "RECORDED" | "QUEUED" | "EXECUTED" | "FAILED" | "CANCELLED";
  actionPayload?: Record<string, any>;
  reasoning: string;
}): Promise<DbAgentAction | null> {
  const {
    caseDbId,
    actionType,
    channel = "SYSTEM",
    status = "RECORDED",
    actionPayload = {},
    reasoning
  } = params;

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("agent_actions")
      .insert({
        case_id: caseDbId,
        action_type: actionType,
        channel,
        status,
        action_payload: actionPayload,
        reasoning,
        executed_at: now,
        created_at: now
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn(`Pahadi AI [audit log notice: ${actionType}]:`, error.message);
      return null;
    }
    return data as DbAgentAction;
  } catch (err) {
    console.warn(`Pahadi AI [audit log failure: ${actionType}]:`, err);
    return null;
  }
}

/**
 * Main Pahadi AI Autonomous Revenue Recovery Agent
 *
 * Transforms raw drop-offs & payment failures into explainable, policy-guarded,
 * and auditable revenue recovery actions.
 *
 * Pipeline:
 * Revenue Event -> Diagnosis -> Recovery Score -> Decision -> Policy Gate -> Execution -> Audit Log
 */
export async function processRecoveryCase(
  caseIdentifier: string,
  options?: AgentExecutionOptions
): Promise<AgentProcessResult> {
  const auditActionsRecorded: string[] = [];

  try {
    if (!caseIdentifier || typeof caseIdentifier !== "string") {
      throw new Error("Invalid case identifier provided to processRecoveryCase");
    }

    // 1. Fetch Recovery Case (supports case_id, UUID id, or order_id)
    let recoveryCase: DbRecoveryCase | null = null;

    const { data: caseByCaseId } = await supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .eq("case_id", caseIdentifier)
      .maybeSingle();

    if (caseByCaseId) {
      recoveryCase = caseByCaseId as DbRecoveryCase;
    } else {
      const { data: caseByUuid } = await supabaseAdmin
        .from("recovery_cases")
        .select("*")
        .eq("id", caseIdentifier)
        .maybeSingle();

      if (caseByUuid) {
        recoveryCase = caseByUuid as DbRecoveryCase;
      } else {
        const { data: caseByOrderId } = await supabaseAdmin
          .from("recovery_cases")
          .select("*")
          .eq("order_id", caseIdentifier)
          .maybeSingle();

        if (caseByOrderId) {
          recoveryCase = caseByOrderId as DbRecoveryCase;
        }
      }
    }

    if (!recoveryCase) {
      return {
        success: false,
        caseId: caseIdentifier,
        diagnosis: {
          category: "UNKNOWN_FAILURE",
          confidence: 0,
          reason: "Recovery case not found in database.",
          isRecoverable: false
        },
        recoveryProbability: 0,
        expectedRecovery: 0,
        scoreFactors: [],
        decision: {
          action: "NO_ACTION",
          priority: "LOW",
          expectedRecovery: 0,
          reason: "Case not found."
        },
        policy: {
          allowed: false,
          reason: "Case not found.",
          policyConfig: DEFAULT_RECOVERY_POLICY
        },
        execution: {
          success: false,
          status: "SKIPPED",
          actionType: "NO_ACTION",
          channel: "SYSTEM",
          executionDetails: { error: "Case not found" }
        },
        auditActionsRecorded: [],
        error: `Recovery case not found for identifier: ${caseIdentifier}`
      };
    }

    const caseDbId = recoveryCase.id;

    // 2. Fetch Associated Revenue Event(s)
    let revenueEvent: DbRevenueEvent | null = null;
    if (recoveryCase.last_event_id) {
      const { data: eventByLastId } = await supabaseAdmin
        .from("revenue_events")
        .select("*")
        .or(`id.eq.${recoveryCase.last_event_id},event_id.eq.${recoveryCase.last_event_id}`)
        .maybeSingle();

      if (eventByLastId) revenueEvent = eventByLastId as DbRevenueEvent;
    }

    if (!revenueEvent && recoveryCase.order_id) {
      const { data: eventByOrder } = await supabaseAdmin
        .from("revenue_events")
        .select("*")
        .eq("order_id", recoveryCase.order_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (eventByOrder) revenueEvent = eventByOrder as DbRevenueEvent;
    }

    // 3. Fetch Customer History Context & Past Actions
    let customerSuccessfulOrders = 0;
    let customerTotalOrders = 0;

    if (options?.customContext?.successfulOrdersCount !== undefined) {
      customerSuccessfulOrders = options.customContext.successfulOrdersCount;
      customerTotalOrders = options.customContext.totalOrdersCount ?? customerSuccessfulOrders;
    } else if (recoveryCase.customer_email || recoveryCase.customer_id) {
      let ordersQuery = supabaseAdmin.from("orders").select("id, payment_status, total");
      if (recoveryCase.customer_email) {
        ordersQuery = ordersQuery.eq("email", recoveryCase.customer_email);
      } else if (recoveryCase.customer_id) {
        ordersQuery = ordersQuery.eq("user_id", recoveryCase.customer_id);
      }

      const { data: pastOrders } = await ordersQuery;
      if (pastOrders && Array.isArray(pastOrders)) {
        customerTotalOrders = pastOrders.length;
        customerSuccessfulOrders = pastOrders.filter(
          (o: any) => o.payment_status === "Paid"
        ).length;
      }
    }

    const { data: previousDbActions } = await supabaseAdmin
      .from("agent_actions")
      .select("*")
      .eq("case_id", caseDbId)
      .order("created_at", { ascending: true });

    const previousActions: DbAgentAction[] = (previousDbActions as DbAgentAction[]) || [];
    const retryCount = previousActions.filter(
      (a) =>
        a.action_type === "RECOVERY_INITIATED" &&
        a.action_payload?.action === "RETRY_PAYMENT"
    ).length;

    // 4. Audit: CASE_ANALYZED
    await recordAuditAction({
      caseDbId,
      actionType: "CASE_ANALYZED",
      channel: "SYSTEM",
      status: "RECORDED",
      actionPayload: {
        orderId: recoveryCase.order_id,
        amount: recoveryCase.amount,
        customerEmail: recoveryCase.customer_email,
        customerSuccessfulOrders,
        retryCount
      },
      reasoning: `Pahadi AI analyzing recovery case ${recoveryCase.case_id} (Order: ${recoveryCase.order_id}, Amount: ₹${recoveryCase.amount}).`
    });
    auditActionsRecorded.push("CASE_ANALYZED");

    // 5. Stage 1: Diagnosis Engine
    const diagnosisContext: DiagnosisContext = {
      previousAttemptsCount: retryCount,
      customerSuccessfulOrdersCount: customerSuccessfulOrders,
      customerPreviousOrdersCount: customerTotalOrders,
      isRepeatFailure: retryCount > 0
    };

    const diagnosis: DiagnosisResult = diagnoseRevenueEvent(revenueEvent, diagnosisContext);

    await recordAuditAction({
      caseDbId,
      actionType: "DIAGNOSIS_COMPLETED",
      channel: "SYSTEM",
      status: "RECORDED",
      actionPayload: { diagnosis },
      reasoning: `Diagnosis category: ${diagnosis.category} (Confidence: ${Math.round(diagnosis.confidence * 100)}%). ${diagnosis.reason}`
    });
    auditActionsRecorded.push("DIAGNOSIS_COMPLETED");

    // 6. Stage 2: Recovery Score
    const recoveryScore = calculateRecoveryScore({
      amount: Number(recoveryCase.amount) || 0,
      diagnosis,
      customerSuccessfulOrders,
      previousRecoveryAttempts: retryCount,
      isRepeatedFailure: retryCount > 0
    });

    await recordAuditAction({
      caseDbId,
      actionType: "RECOVERY_SCORE_CALCULATED",
      channel: "SYSTEM",
      status: "RECORDED",
      actionPayload: {
        recoveryProbability: recoveryScore.recoveryProbability,
        expectedRecovery: recoveryScore.expectedRecovery,
        factors: recoveryScore.factors
      },
      reasoning: recoveryScore.reasoning
    });
    auditActionsRecorded.push("RECOVERY_SCORE_CALCULATED");

    // 7. Stage 3: Decision Engine
    const customerContext: CustomerContext = {
      customerId: recoveryCase.customer_id,
      customerName: recoveryCase.customer_name,
      customerEmail: recoveryCase.customer_email,
      customerPhone: recoveryCase.customer_phone,
      totalOrdersCount: customerTotalOrders,
      successfulOrdersCount: customerSuccessfulOrders,
      ...options?.customContext
    };

    const decision: RecoveryDecision = selectRecoveryAction({
      revenueEvent,
      recoveryCase,
      diagnosis,
      recoveryProbability: recoveryScore.recoveryProbability,
      expectedRecovery: recoveryScore.expectedRecovery,
      customerContext,
      previousAttemptsCount: retryCount
    });

    await recordAuditAction({
      caseDbId,
      actionType: "RECOVERY_ACTION_SELECTED",
      channel: decision.suggestedChannel || "SYSTEM",
      status: "RECORDED",
      actionPayload: { decision },
      reasoning: `Selected action ${decision.action} [Priority: ${decision.priority}]. ${decision.reason}`
    });
    auditActionsRecorded.push("RECOVERY_ACTION_SELECTED");

    // 8. Stage 4: Policy Engine (CRITICAL SAFETY GATE)
    const policyResult: PolicyEvaluationResult = evaluatePolicy({
      action: decision.action,
      amount: Number(recoveryCase.amount) || 0,
      retryCount,
      recoveryStatus: recoveryCase.recovery_status,
      recoveryProbability: recoveryScore.recoveryProbability,
      caseId: recoveryCase.id,
      config: options?.policyConfig,
      previousActions
    });

    // 9. Handle Policy Gate Decision
    if (!policyResult.allowed) {
      // Record Policy Block in Audit Log
      await recordAuditAction({
        caseDbId,
        actionType: "POLICY_BLOCKED",
        channel: "SYSTEM",
        status: "CANCELLED",
        actionPayload: {
          blockedAction: decision.action,
          violatedPolicy: policyResult.violatedPolicy,
          policyConfig: policyResult.policyConfig
        },
        reasoning: `Action ${decision.action} blocked by policy: ${policyResult.reason}`
      });
      auditActionsRecorded.push("POLICY_BLOCKED");

      // Update case metadata with policy evaluation notes
      const now = new Date().toISOString();
      await supabaseAdmin
        .from("recovery_cases")
        .update({
          updated_at: now,
          metadata: {
            ...recoveryCase.metadata,
            lastPolicyEvaluation: {
              allowed: false,
              reason: policyResult.reason,
              timestamp: now
            }
          }
        })
        .eq("id", caseDbId);

      const executionSkipped: ExecutionResult = {
        success: false,
        status: "SKIPPED",
        actionType: decision.action,
        channel: "SYSTEM",
        executionDetails: {
          reason: "Execution skipped due to policy rejection.",
          policyReason: policyResult.reason
        },
        error: policyResult.reason
      };

      return {
        success: true,
        caseId: recoveryCase.case_id,
        orderId: recoveryCase.order_id,
        eventId: revenueEvent?.event_id || recoveryCase.last_event_id || undefined,
        diagnosis,
        recoveryProbability: recoveryScore.recoveryProbability,
        expectedRecovery: recoveryScore.expectedRecovery,
        scoreFactors: recoveryScore.factors,
        decision,
        policy: policyResult,
        execution: executionSkipped,
        auditActionsRecorded
      };
    }

    // Record Policy Approval in Audit Log
    await recordAuditAction({
      caseDbId,
      actionType: "POLICY_APPROVED",
      channel: "SYSTEM",
      status: "RECORDED",
      actionPayload: {
        approvedAction: decision.action,
        policyConfig: policyResult.policyConfig
      },
      reasoning: `Policy approval granted: ${policyResult.reason}`
    });
    auditActionsRecorded.push("POLICY_APPROVED");

    // 10. Stage 5: Recovery Execution
    let executionResult: ExecutionResult;
    if (options?.skipExecution) {
      executionResult = {
        success: true,
        status: "SKIPPED",
        actionType: decision.action,
        channel: decision.suggestedChannel || "SYSTEM",
        executionDetails: { mode: "DRY_RUN_SKIPPED" }
      };
    } else {
      executionResult = await executeRecoveryAction({
        recoveryCase,
        revenueEvent,
        decision,
        policy: policyResult
      });

      if (executionResult.success) {
        await recordAuditAction({
          caseDbId,
          actionType: "RECOVERY_INITIATED",
          channel: executionResult.channel,
          status: "EXECUTED",
          actionPayload: {
            action: decision.action,
            executionDetails: executionResult.executionDetails
          },
          reasoning: `Recovery action ${decision.action} initiated successfully via ${executionResult.channel}.`
        });
        auditActionsRecorded.push("RECOVERY_INITIATED");

        // Update Recovery Case Status & Metadata
        const now = new Date().toISOString();
        const updatedStatus =
          decision.action === "NO_ACTION"
            ? recoveryCase.recovery_status
            : "IN_RECOVERY";

        await supabaseAdmin
          .from("recovery_cases")
          .update({
            recovery_status: updatedStatus,
            updated_at: now,
            metadata: {
              ...recoveryCase.metadata,
              lastAgentExecution: {
                action: decision.action,
                status: executionResult.status,
                timestamp: now,
                expectedRecovery: recoveryScore.expectedRecovery
              }
            }
          })
          .eq("id", caseDbId);
      } else {
        await recordAuditAction({
          caseDbId,
          actionType: "RECOVERY_FAILED",
          channel: executionResult.channel,
          status: "FAILED",
          actionPayload: { error: executionResult.error },
          reasoning: `Recovery execution encountered an issue: ${executionResult.error || "Unknown execution error"}`
        });
        auditActionsRecorded.push("RECOVERY_FAILED");
      }
    }

    return {
      success: true,
      caseId: recoveryCase.case_id,
      orderId: recoveryCase.order_id,
      eventId: revenueEvent?.event_id || recoveryCase.last_event_id || undefined,
      diagnosis,
      recoveryProbability: recoveryScore.recoveryProbability,
      expectedRecovery: recoveryScore.expectedRecovery,
      scoreFactors: recoveryScore.factors,
      decision,
      policy: policyResult,
      execution: executionResult,
      auditActionsRecorded
    };
  } catch (error: any) {
    console.error("Pahadi AI [processRecoveryCase error]:", error);
    return {
      success: false,
      caseId: caseIdentifier,
      diagnosis: {
        category: "UNKNOWN_FAILURE",
        confidence: 0,
        reason: error?.message || "Agent execution error",
        isRecoverable: false
      },
      recoveryProbability: 0,
      expectedRecovery: 0,
      scoreFactors: [],
      decision: {
        action: "NO_ACTION",
        priority: "LOW",
        expectedRecovery: 0,
        reason: error?.message || "Error occurred"
      },
      policy: {
        allowed: false,
        reason: "Execution error caught in agent orchestrator.",
        policyConfig: DEFAULT_RECOVERY_POLICY
      },
      execution: {
        success: false,
        status: "FAILED",
        actionType: "NO_ACTION",
        channel: "SYSTEM",
        executionDetails: { error: error?.message },
        error: error?.message
      },
      auditActionsRecorded,
      error: error?.message || "Internal agent processing error"
    };
  }
}

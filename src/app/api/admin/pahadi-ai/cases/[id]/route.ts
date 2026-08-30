import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { processRecoveryCase } from "@/lib/ai/agent";
import { diagnoseRevenueEvent } from "@/lib/ai/diagnosis";
import { calculateRecoveryScore } from "@/lib/ai/recovery-score";
import { selectRecoveryAction } from "@/lib/ai/decision-engine";
import { evaluatePolicy } from "@/lib/ai/policy-engine";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing case ID" }, { status: 400 });
    }

    // 1. Fetch Recovery Case
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .or(`id.eq.${id},case_id.eq.${id},order_id.eq.${id}`)
      .maybeSingle();

    if (caseError || !caseData) {
      return NextResponse.json({ success: false, error: "Recovery case not found" }, { status: 404 });
    }

    // 2. Fetch associated Revenue Events
    const { data: eventsData } = await supabaseAdmin
      .from("revenue_events")
      .select("*")
      .eq("order_id", caseData.order_id)
      .order("created_at", { ascending: false });

    // 3. Fetch associated Agent Actions
    const { data: actionsData } = await supabaseAdmin
      .from("agent_actions")
      .select("*")
      .eq("case_id", caseData.id)
      .order("created_at", { ascending: false });

    // 4. Calculate explainability & AI Analysis
    const latestEvent = eventsData && eventsData.length > 0 ? eventsData[0] : null;

    const diagnosis = diagnoseRevenueEvent(latestEvent, {
      customerSuccessfulOrdersCount: 1,
      previousAttemptsCount: (actionsData || []).filter(
        (a) => a.action_type === "RECOVERY_INITIATED"
      ).length
    });

    const score = calculateRecoveryScore({
      amount: Number(caseData.amount) || 0,
      diagnosis,
      customerSuccessfulOrders: 1,
      previousRecoveryAttempts: (actionsData || []).filter(
        (a) => a.action_type === "RECOVERY_INITIATED"
      ).length
    });

    const decision = selectRecoveryAction({
      revenueEvent: latestEvent,
      recoveryCase: caseData,
      diagnosis,
      recoveryProbability: score.recoveryProbability,
      expectedRecovery: score.expectedRecovery
    });

    const policy = evaluatePolicy({
      action: decision.action,
      amount: Number(caseData.amount) || 0,
      retryCount: (actionsData || []).filter((a) => a.action_type === "RECOVERY_INITIATED").length,
      recoveryStatus: caseData.recovery_status,
      recoveryProbability: score.recoveryProbability,
      caseId: caseData.id
    });

    return NextResponse.json({
      success: true,
      case: caseData,
      events: eventsData || [],
      actions: actionsData || [],
      analysis: {
        diagnosis,
        score,
        decision,
        policy
      }
    });
  } catch (error: any) {
    console.error("GET /api/admin/pahadi-ai/cases/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST triggers on-demand autonomous agent analysis & execution
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing case ID" }, { status: 400 });
    }

    const agentResult = await processRecoveryCase(id);

    return NextResponse.json({
      success: true,
      result: agentResult
    });
  } catch (error: any) {
    console.error("POST /api/admin/pahadi-ai/cases/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to analyze case" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { diagnoseRevenueEvent } from "@/lib/ai/diagnosis";
import { calculateRecoveryScore } from "@/lib/ai/recovery-score";
import { selectRecoveryAction } from "@/lib/ai/decision-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").toLowerCase().trim();
    const status = searchParams.get("status") || "ALL";
    const actionFilter = searchParams.get("action") || "ALL";

    let dbQuery = supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .order("created_at", { ascending: false });

    if (status !== "ALL") {
      dbQuery = dbQuery.eq("recovery_status", status);
    }

    const { data: casesData, error } = await dbQuery;

    if (error) {
      console.warn("Pahadi AI [cases query error]:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let cases = casesData || [];

    // Filter by search query across customer name, email, order ID, case ID
    if (query) {
      cases = cases.filter((c: any) => {
        const name = (c.customer_name || "").toLowerCase();
        const email = (c.customer_email || "").toLowerCase();
        const orderId = (c.order_id || "").toLowerCase();
        const caseId = (c.case_id || "").toLowerCase();
        return (
          name.includes(query) ||
          email.includes(query) ||
          orderId.includes(query) ||
          caseId.includes(query)
        );
      });
    }

    // Enrich cases with calculated AI scoring metrics for table visualization
    const enrichedCases = cases.map((c: any) => {
      const syntheticEvent = {
        id: c.last_event_id || `evt_${c.order_id}`,
        event_id: c.last_event_id || `evt_${c.order_id}`,
        event_type: (c.stage === "PAYMENT_FAILED" ? "PAYMENT_FAILED" : "MODAL_DISMISSED") as any,
        order_id: c.order_id,
        razorpay_order_id: c.razorpay_order_id,
        razorpay_payment_id: null,
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        customer_email: c.customer_email,
        customer_phone: c.customer_phone,
        amount: Number(c.amount) || 0,
        currency: c.currency || "INR",
        status: "RECORDED" as const,
        failure_reason: c.failure_reason,
        raw_payload: {},
        created_at: c.created_at,
        processed_at: c.created_at
      };

      const diagnosis = diagnoseRevenueEvent(syntheticEvent, {
        customerSuccessfulOrdersCount: 1
      });

      const score = calculateRecoveryScore({
        amount: Number(c.amount) || 0,
        diagnosis,
        customerSuccessfulOrders: 1
      });

      const decision = selectRecoveryAction({
        diagnosis,
        recoveryProbability: score.recoveryProbability,
        expectedRecovery: score.expectedRecovery
      });

      return {
        ...c,
        aiDiagnosis: diagnosis,
        recoveryProbability: score.recoveryProbability,
        expectedRecovery: score.expectedRecovery,
        recommendedAction: decision.action,
        actionPriority: decision.priority
      };
    });

    // Optional Action filter
    const finalCases =
      actionFilter === "ALL"
        ? enrichedCases
        : enrichedCases.filter((c: any) => c.recommendedAction === actionFilter);

    return NextResponse.json({
      success: true,
      count: finalCases.length,
      cases: finalCases
    });
  } catch (error: any) {
    console.error("GET /api/admin/pahadi-ai/cases error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load recovery cases" },
      { status: 500 }
    );
  }
}

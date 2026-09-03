import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getActiveRecoveryPolicy } from "@/lib/ai/policy-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Query recovery_cases
    const { data: casesData, error: casesError } = await supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .order("created_at", { ascending: false });

    if (casesError) {
      console.warn("Pahadi AI [overview cases query error]:", casesError.message);
    }

    const cases = casesData || [];

    // 2. Query revenue_events
    const { data: eventsData, error: eventsError } = await supabaseAdmin
      .from("revenue_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (eventsError) {
      console.warn("Pahadi AI [overview events query error]:", eventsError.message);
    }

    const events = eventsData || [];

    // 3. Query agent_actions
    const { data: actionsData, error: actionsError } = await supabaseAdmin
      .from("agent_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (actionsError) {
      console.warn("Pahadi AI [overview actions query error]:", actionsError.message);
    }

    const actions = actionsData || [];

    // 4. Calculate Real Production Metrics (Strict Demo Data Isolation)
    // Simulated demo cases must NEVER pollute real production financial KPIs
    const isDemoRecord = (c: any) =>
      c.metadata?.demo === true ||
      c.metadata?.is_demo === true ||
      c.metadata?.source === "pahadi_ai_demo" ||
      (c.order_id && String(c.order_id).startsWith("demo-"));

    const prodCases = cases.filter((c: any) => !isDemoRecord(c));
    const demoCases = cases.filter((c: any) => isDemoRecord(c));

    let revenueAtRisk = 0;
    let revenueRecovered = 0;
    let totalDropoffRevenue = 0;

    const statusCounts: Record<string, number> = {
      OPEN: 0,
      IN_RECOVERY: 0,
      RECOVERED: 0,
      LOST: 0,
      DISMISSED: 0
    };

    prodCases.forEach((c: any) => {
      const amt = Number(c.amount) || 0;
      totalDropoffRevenue += amt;

      const st = c.recovery_status || "OPEN";
      if (statusCounts[st] !== undefined) {
        statusCounts[st] += 1;
      } else {
        statusCounts[st] = 1;
      }

      if (st === "OPEN" || st === "IN_RECOVERY") {
        revenueAtRisk += amt;
      } else if (st === "RECOVERED") {
        revenueRecovered += amt;
      }
    });

    const activeCasesCount = statusCounts["OPEN"] + statusCounts["IN_RECOVERY"];
    const totalCasesCount = prodCases.length;

    // Defined recovery rate: recovered / (recovered + at_risk)
    const recoveryDenominator = revenueRecovered + revenueAtRisk;
    const recoveryRate =
      recoveryDenominator > 0
        ? Math.round((revenueRecovered / recoveryDenominator) * 1000) / 10
        : 0;

    const caseRecoveryRate =
      totalCasesCount > 0
        ? Math.round((statusCounts["RECOVERED"] / totalCasesCount) * 1000) / 10
        : 0;

    // Demo-only metrics (tracked for sandbox visibility without inflating production revenue)
    let demoRevenueSimulated = 0;
    let demoRevenueRecovered = 0;
    demoCases.forEach((c: any) => {
      const amt = Number(c.amount) || 0;
      demoRevenueSimulated += amt;
      if (c.recovery_status === "RECOVERED") {
        demoRevenueRecovered += amt;
      }
    });

    // 5. Calculate Actions breakdown
    const actionCounts: Record<string, number> = {
      RETRY_PAYMENT: 0,
      SEND_REMINDER: 0,
      NO_ACTION: 0
    };

    actions.forEach((a: any) => {
      const act = a.action_payload?.action || a.action_payload?.decision?.action;
      if (act && actionCounts[act] !== undefined) {
        actionCounts[act] += 1;
      }
    });

    // 6. Calculate daily trend for charts (last 7 days)
    const daysMap: Record<string, { date: string; atRisk: number; recovered: number; events: number }> = {};
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
      daysMap[dateKey] = { date: label, atRisk: 0, recovered: 0, events: 0 };
    }

    prodCases.forEach((c: any) => {
      if (c.created_at) {
        const dateKey = c.created_at.split("T")[0];
        if (daysMap[dateKey]) {
          const amt = Number(c.amount) || 0;
          if (c.recovery_status === "RECOVERED") {
            daysMap[dateKey].recovered += amt;
          } else {
            daysMap[dateKey].atRisk += amt;
          }
        }
      }
    });

    events.forEach((e: any) => {
      if (e.created_at) {
        const dateKey = e.created_at.split("T")[0];
        if (daysMap[dateKey]) {
          daysMap[dateKey].events += 1;
        }
      }
    });

    const dailyTrend = Object.values(daysMap);

    return NextResponse.json({
      success: true,
      agentStatus: "ONLINE",
      kpis: {
        revenueAtRisk,
        revenueRecovered,
        recoveryRate,
        caseRecoveryRate,
        activeCasesCount,
        totalCasesCount,
        totalEventsCount: events.length,
        totalActionsCount: actions.length
      },
      demoStats: {
        demoCasesCount: demoCases.length,
        demoRevenueSimulated,
        demoRevenueRecovered
      },
      statusCounts,
      actionCounts,
      dailyTrend,
      activePolicy: getActiveRecoveryPolicy(),
      recentActivity: actions.slice(0, 10),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("GET /api/admin/pahadi-ai/overview error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to load Pahadi AI overview"
      },
      { status: 500 }
    );
  }
}

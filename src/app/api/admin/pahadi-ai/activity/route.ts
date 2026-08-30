import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Fetch latest agent actions
    const { data: actions, error } = await supabaseAdmin
      .from("agent_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Pahadi AI [activity query error]:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Fetch related recovery case identifiers for rich display
    const caseIds = [...new Set((actions || []).map((a) => a.case_id).filter(Boolean))];
    let casesMap: Record<string, any> = {};

    if (caseIds.length > 0) {
      const { data: casesData } = await supabaseAdmin
        .from("recovery_cases")
        .select("id, case_id, order_id, customer_name, amount, recovery_status")
        .in("id", caseIds);

      if (casesData) {
        casesData.forEach((c) => {
          casesMap[c.id] = c;
        });
      }
    }

    const formattedActions = (actions || []).map((a) => {
      const linkedCase = casesMap[a.case_id] || null;
      return {
        ...a,
        case_friendly_id: linkedCase?.case_id || a.case_id,
        order_id: linkedCase?.order_id || a.action_payload?.orderId || null,
        customer_name: linkedCase?.customer_name || a.action_payload?.customerName || "Customer",
        amount: linkedCase?.amount || a.action_payload?.amount || null,
        recovery_status: linkedCase?.recovery_status || null
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedActions.length,
      actions: formattedActions
    });
  } catch (error: any) {
    console.error("GET /api/admin/pahadi-ai/activity error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load agent activity" },
      { status: 500 }
    );
  }
}

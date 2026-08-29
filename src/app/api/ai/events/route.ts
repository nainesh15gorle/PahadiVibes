// src/app/api/ai/events/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkAdminAuth } from "@/lib/auth";
import { recordRevenueEvent } from "@/lib/ai/revenue-events";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/events
 * Admin-protected telemetry endpoint returning revenue events and recovery cases summary.
 */
export async function GET(request: Request) {
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const status = searchParams.get("status");

    // 1. Fetch recent events
    let eventsQuery = supabaseAdmin
      .from("revenue_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      eventsQuery = eventsQuery.eq("event_type", status);
    }

    const { data: events, error: eventsError } = await eventsQuery;

    if (eventsError) {
      console.warn("Pahadi AI GET /api/ai/events query notice:", eventsError.message);
    }

    // 2. Fetch active recovery cases
    const { data: cases } = await supabaseAdmin
      .from("recovery_cases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    // 3. Fetch recent agent actions
    const { data: actions } = await supabaseAdmin
      .from("agent_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    // 4. Calculate metrics
    const recoveryCasesList = cases || [];
    const openCasesCount = recoveryCasesList.filter((c: any) => c.recovery_status === "OPEN").length;
    const recoveredCases = recoveryCasesList.filter((c: any) => c.recovery_status === "RECOVERED");
    const recoveredAmount = recoveredCases.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        events: events || [],
        cases: recoveryCasesList,
        actions: actions || [],
        metrics: {
          totalEventsCount: (events || []).length,
          totalCasesCount: recoveryCasesList.length,
          openCasesCount,
          recoveredCasesCount: recoveredCases.length,
          recoveredAmount
        }
      }
    });
  } catch (error: any) {
    console.error("GET /api/ai/events error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/events
 * Ingestion endpoint for revenue events with strict idempotency.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || !body.eventType) {
      return NextResponse.json(
        { success: false, error: "Missing required 'eventType' field" },
        { status: 400 }
      );
    }

    const result = await recordRevenueEvent({
      eventId: body.eventId,
      eventType: body.eventType,
      orderId: body.orderId,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      customerId: body.customerId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      amount: body.amount,
      currency: body.currency,
      failureReason: body.failureReason,
      cartItems: body.cartItems,
      rawPayload: body.rawPayload,
      metadata: body.metadata
    });

    return NextResponse.json({
      success: result.success,
      isDuplicate: result.isDuplicate,
      data: {
        event: result.event,
        recoveryCase: result.recoveryCase,
        action: result.action
      },
      error: result.error
    }, { status: result.success ? (result.isDuplicate ? 200 : 201) : 500 });
  } catch (error: any) {
    console.error("POST /api/ai/events error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

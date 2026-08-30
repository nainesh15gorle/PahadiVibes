import { NextResponse } from "next/server";
import {
  getActiveRecoveryPolicy,
  updateActiveRecoveryPolicy,
  DEFAULT_RECOVERY_POLICY
} from "@/lib/ai/policy-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const policy = getActiveRecoveryPolicy();
    return NextResponse.json({
      success: true,
      policy,
      defaults: DEFAULT_RECOVERY_POLICY
    });
  } catch (error: any) {
    console.error("GET /api/admin/pahadi-ai/settings error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const updatedPolicy = updateActiveRecoveryPolicy({
      automaticRecoveryEnabled:
        typeof body.automaticRecoveryEnabled === "boolean"
          ? body.automaticRecoveryEnabled
          : undefined,
      maxRetryAttempts:
        typeof body.maxRetryAttempts === "number"
          ? body.maxRetryAttempts
          : undefined,
      maxAutomaticRecoveryAmount:
        typeof body.maxAutomaticRecoveryAmount === "number"
          ? body.maxAutomaticRecoveryAmount
          : undefined,
      minRecoveryProbabilityThreshold:
        typeof body.minRecoveryProbabilityThreshold === "number"
          ? body.minRecoveryProbabilityThreshold
          : undefined
    });

    console.log("Pahadi AI [Policy Settings Updated]:", updatedPolicy);

    return NextResponse.json({
      success: true,
      message: "Pahadi AI policy configuration updated successfully.",
      policy: updatedPolicy
    });
  } catch (error: any) {
    console.error("POST /api/admin/pahadi-ai/settings error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}

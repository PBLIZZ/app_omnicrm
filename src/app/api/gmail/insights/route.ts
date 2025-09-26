/**
 * GET /api/gmail/insights — AI-powered email insights endpoint
 *
 * Provides AI-generated insights and patterns from Gmail data
 */
import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GmailInsightsService } from "@/server/services/gmail-insights.service";
import { ApiEnvelope } from "@/lib/utils/type-guards";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const insights = await GmailInsightsService.generateInsights(userId);

    const envelope: ApiEnvelope<{ insights: typeof insights }> = { ok: true, data: { insights } };
    return NextResponse.json(envelope);

  } catch (error: unknown) {
    console.error("GET /api/gmail/insights error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    if (errorMessage.includes("unauthorized") || errorMessage.includes("auth")) {
      const envelope: ApiEnvelope = { ok: false, error: "Authentication required" };
      return NextResponse.json(envelope, { status: 401 });
    }

    const envelope: ApiEnvelope = { ok: false, error: "Failed to generate insights" };
    return NextResponse.json(envelope, { status: 500 });
  }
}
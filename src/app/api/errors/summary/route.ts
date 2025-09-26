/**
 * GET /api/errors/summary — Comprehensive error summary with recovery suggestions
 *
 * Provides detailed error analysis for sync operations including:
 * - Error counts by category and severity
 * - Recent errors with classifications
 * - Recovery action recommendations
 * - Error patterns and trends
 * - Critical issues requiring immediate attention
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { ErrorSummaryService } from "@/server/services/error-summary.service";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const rawQuery = {
      timeRangeHours: searchParams.get("timeRangeHours"),
      includeResolved: searchParams.get("includeResolved"),
      provider: searchParams.get("provider"),
      stage: searchParams.get("stage"),
      severityFilter: searchParams.get("severityFilter"),
      includeDetails: searchParams.get("includeDetails"),
    };

    const query = ErrorSummaryService.validateQuery(rawQuery);

    // Get comprehensive error summary using service
    const errorSummary = await ErrorSummaryService.getErrorSummary(userId, query);

    return NextResponse.json(errorSummary);
  } catch (error) {
    console.error("Failed to get error summary:", error);

    await logger.error(
      "Error summary generation failed",
      {
        operation: "api.errors.summary",
        additionalData: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      ensureError(error),
    );

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Failed to generate error summary" }, { status: 500 });
  }
}

import { createRouteHandler } from "@/server/api/handler";
import { CalendarEmbeddingService } from "@/server/services/calendar-embedding.service";
import { ApiResponseBuilder } from "@/server/api/response";
import { logger } from "@/lib/observability";
import { z } from "zod";

const insightsQuerySchema = z.object({
  provider: z.enum(["calendar", "gmail", "both"]).default("both"),
  timeframe: z.enum(["week", "month", "quarter"]).default("month"),
});

// GET: Get AI insights from Google data (calendar, gmail, or both)
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_insights" },
  validation: {
    query: insightsQuerySchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("google.insights", requestId);

  try {
    const { provider, timeframe } = validated.query;

    await logger.info("google_insights_started", {
      operation: "google.insights",
      additionalData: {
        userId,
        provider,
        timeframe,
      },
    });

    const insights: Record<string, unknown> = {
      provider,
      timeframe,
      generatedAt: new Date().toISOString(),
    };

    // Get calendar insights
    if (provider === "calendar" || provider === "both") {
      try {
        const calendarInsights = await CalendarEmbeddingService.getCalendarInsights(
          userId,
          timeframe,
        );
        insights["calendar"] = calendarInsights;
      } catch (error) {
        await logger.warn("calendar_insights_failed", {
          operation: "google.insights",
          additionalData: {
            userId,
            error: error instanceof Error ? error.message : String(error),
          },
        });
        insights["calendar"] = { error: "Failed to generate calendar insights" };
      }
    }

    // Get Gmail insights (placeholder - remove mock data)
    if (provider === "gmail" || provider === "both") {
      // TODO: Implement real Gmail insights from interactions table
      await logger.info("gmail_insights_not_implemented", {
        operation: "google.insights",
        additionalData: { userId },
      });
      insights["gmail"] = {
        error: "Gmail insights not yet implemented",
        message: "Will be available once Gmail data is processed through the ingestion pipeline",
      };
    }

    await logger.info("google_insights_completed", {
      operation: "google.insights",
      additionalData: {
        userId,
        provider,
        hasCalendarInsights:
          !!insights["calendar"] && !(insights["calendar"] as { error?: string }).error,
        hasGmailInsights: !!insights["gmail"] && !(insights["gmail"] as { error?: string }).error,
      },
    });

    return api.success({
      success: true,
      insights,
    });
  } catch (error: unknown) {
    await logger.error(
      "google_insights_failed",
      {
        operation: "google.insights",
        additionalData: {
          userId,
        },
      },
      error instanceof Error ? error : new Error("Unknown error"),
    );

    return api.error(
      "Failed to generate insights",
      "INTERNAL_ERROR",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
});

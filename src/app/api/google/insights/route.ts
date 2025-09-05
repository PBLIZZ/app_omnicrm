import { getServerUserId } from "@/server/auth/user";
import { CalendarEmbeddingService } from "@/server/services/calendar-embedding.service";
import { err, ok } from "@/lib/api/http";
import { log } from "@/lib/log";

type Provider = "calendar" | "gmail" | "both";
type Timeframe = "week" | "month" | "quarter";

// GET: Get AI insights from Google data (calendar, gmail, or both)
export async function GET(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (authError: unknown) {
    console.error("Google insights GET - auth error:", authError);
    return err(401, "Unauthorized");
  }

  try {
    const { searchParams } = new URL(request.url);
    const provider = (searchParams.get("provider") as Provider) || "both";
    const timeframe = (searchParams.get("timeframe") as Timeframe) || "month";

    log.info(
      {
        op: "google.insights",
        userId,
        provider,
        timeframe,
      },
      "google_insights_started",
    );

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
        insights.calendar = calendarInsights;
      } catch (error) {
        log.warn(
          {
            op: "google.insights",
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          "calendar_insights_failed",
        );
        insights.calendar = { error: "Failed to generate calendar insights" };
      }
    }

    // Get Gmail insights (placeholder - remove mock data)
    if (provider === "gmail" || provider === "both") {
      // TODO: Implement real Gmail insights from interactions table
      log.info({ op: "google.insights", userId }, "gmail_insights_not_implemented");
      insights.gmail = {
        error: "Gmail insights not yet implemented",
        message: "Will be available once Gmail data is processed through the ingestion pipeline",
      };
    }

    log.info(
      {
        op: "google.insights",
        userId,
        provider,
        hasCalendarInsights: !!insights.calendar && !insights.calendar.error,
        hasGmailInsights: !!insights.gmail && !insights.gmail.error,
      },
      "google_insights_completed",
    );

    return ok({
      success: true,
      insights,
    });
  } catch (error: unknown) {
    log.error(
      {
        op: "google.insights",
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "google_insights_failed",
    );

    return err(500, "Failed to generate insights");
  }
}

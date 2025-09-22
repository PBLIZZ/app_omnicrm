import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { JobCreationService } from "@/server/services/job-creation.service";
import { logger } from "@/lib/observability/unified-logger";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * Manual processor for calendar_events transformation
 * Development only - creates normalize jobs for Google Calendar events
 */
export async function POST(_: NextRequest): Promise<NextResponse> {
  let userId: string | undefined;
  try {
    userId = await getServerUserId();
    const result = await JobCreationService.createCalendarEventJobs(userId);

    return NextResponse.json({
      message: result.message,
      processed: result.processed,
      totalCalendarEvents: result.totalItems,
    });
  } catch (error) {
    console.error("POST /api/jobs/process/calendar-events error:", error);
    await logger.error(
      "Failed to process calendar events",
      {
        operation: "manual_calendar_events_processor",
        additionalData: {
          userId: userId,
        },
      },
      ensureError(error),
    );

    return NextResponse.json({ error: "Failed to process calendar events" }, { status: 500 });
  }
}

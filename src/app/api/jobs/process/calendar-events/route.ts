import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { apiError } from "@/server/api/response";
import { JobCreationService } from "@/server/services/job-creation.service";
import { logger } from "@/lib/observability/unified-logger";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * Manual processor for calendar_events transformation
 * Development only - creates normalize jobs for Google Calendar events
 */
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "manual_job_process" },
})(async ({ userId, requestId }) => {

  try {
    const result = await JobCreationService.createCalendarEventJobs(userId);

    return NextResponse.json({
      message: result.message,
      processed: result.processed,
      totalCalendarEvents: result.totalItems,
    });

  } catch (error) {
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

    return apiError(
      "Failed to process calendar events",
      "INTERNAL_ERROR",
      { message: error instanceof Error ? error.message : "Unknown error" },
      ensureError(error),
    );
  }
});

import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { JobCreationService } from "@/server/services/job-creation.service";

/**
 * Manual processor for calendar_events transformation
 * Development only - creates normalize jobs for Google Calendar events
 */
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "calendar_events_processing" },
})(async ({ userId }) => {
  try {
    const result = await JobCreationService.createCalendarEventJobs(userId);

    return NextResponse.json({
      ok: true,
      data: {
        message: result.message,
        processed: result.processed,
        totalCalendarEvents: result.totalItems,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to process calendar events",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
});

import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { calendarEvents, jobs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
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
  const api = new ApiResponseBuilder("manual_calendar_events_processor", requestId);

  try {
    const db = await getDb();

    // Get calendar events for this user
    const calendarEventsData = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId))
      .limit(50); // Process in batches

    if (calendarEventsData.length === 0) {
      return api.success({
        message: "No calendar events found to process",
        processed: 0,
      });
    }

    // Create normalize jobs for calendar events
    const jobsToCreate = calendarEventsData.map(event => ({
      id: crypto.randomUUID(),
      userId: userId,
      kind: 'normalize_google_event' as const,
      payload: {
        calendarEventId: event.id,
        provider: 'calendar',
      },
      status: 'queued' as const,
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    if (jobsToCreate.length > 0) {
      await db.insert(jobs).values(jobsToCreate);
    }

    await logger.info(`Created ${jobsToCreate.length} normalize jobs for calendar events`, {
      operation: "manual_calendar_events_processor",
      additionalData: {
        userId: userId,
        totalCalendarEvents: calendarEventsData.length,
        jobsCreated: jobsToCreate.length,
      },
    });

    return api.success({
      message: `Created ${jobsToCreate.length} normalize jobs from ${calendarEventsData.length} calendar events`,
      processed: jobsToCreate.length,
      totalCalendarEvents: calendarEventsData.length,
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
    
    return api.error(
      "Failed to process calendar events",
      "INTERNAL_ERROR",
      { message: error instanceof Error ? error.message : "Unknown error" },
      ensureError(error),
    );
  }
});

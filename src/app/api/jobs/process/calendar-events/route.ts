import { handleAuth } from "@/lib/api";
import { JobCreationService } from "@/server/services/job-creation.service";
import { SimpleJobProcessSchema, CalendarEventsJobResultSchema } from "@/server/db/business-schemas";

/**
 * Manual processor for calendar_events transformation
 * Development only - creates normalize jobs for Google Calendar events
 */
export const POST = handleAuth(SimpleJobProcessSchema, CalendarEventsJobResultSchema, async (_, userId) => {
  const result = await JobCreationService.createCalendarEventJobs(userId);

  return {
    message: result.message,
    processed: result.processed,
    totalCalendarEvents: result.totalItems,
  };
});

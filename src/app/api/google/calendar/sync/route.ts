/**
 * POST /api/google/calendar/sync — Consolidated Calendar sync endpoint
 */
import { handleAuth } from "@/lib/api";
import { CalendarSyncRequestSchema, CalendarSyncResponseSchema } from "@/server/db/business-schemas";
import { GoogleCalendarSyncService } from "@/server/services/google-calendar-sync.service";
import { isOk, isErr } from "@/lib/utils/result";

export const POST = handleAuth(CalendarSyncRequestSchema, CalendarSyncResponseSchema, async (data, userId) => {
  const syncResult = await GoogleCalendarSyncService.syncCalendar(userId, data);

  if (isErr(syncResult)) {
    throw new Error(syncResult.error.message || "Calendar sync failed");
  }

  return {
    message: syncResult.data.message,
    stats: syncResult.data.stats,
  };
});
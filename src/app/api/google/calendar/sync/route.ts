/**
 * POST /api/google/calendar/sync — Consolidated Calendar sync endpoint
 */
import { handleAuth } from "@/lib/api";
import { CalendarSyncRequestSchema, CalendarSyncResponseSchema } from "@/server/db/business-schemas";
import { GoogleCalendarSyncService } from "@/server/services/google-calendar-sync.service";

export const POST = handleAuth(CalendarSyncRequestSchema, CalendarSyncResponseSchema, async (data, userId) => {
  const syncResult = await GoogleCalendarSyncService.syncCalendar(userId, data);

  if (!syncResult.ok) {
    throw new Error(syncResult.error || "Calendar sync failed");
  }

  return {
    ok: true,
    data: {
      message: syncResult.data.message,
      stats: syncResult.data.stats,
    },
  };
});
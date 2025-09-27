import { handleAuth } from "@/lib/api";
import { CalendarImportRequestSchema } from "@/server/db/business-schemas";
import { CalendarImportService } from "@/server/services/calendar-import.service";

// Note: Using unknown for response schema since CalendarImportService.importCalendars returns unknown
export const POST = handleAuth(CalendarImportRequestSchema, undefined, async (data, userId) => {
  return await CalendarImportService.importCalendars(userId, data);
});

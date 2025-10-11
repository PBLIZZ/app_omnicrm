/**
 * GET /api/google/calendar/status — DEPRECATED Calendar connection status
 *
 * ⚠️ DEPRECATED: This endpoint is deprecated. Use /api/google/status instead.
 *
 * This endpoint will be removed in a future version. The unified endpoint
 * provides the same functionality with improved performance and consistency.
 *
 * Migration guide:
 * - Replace calls to /api/google/calendar/status with /api/google/status
 * - Access Calendar data via response.services.calendar instead of root level
 */
import { handleGetWithQueryAuth } from "@/lib/api";
import { CalendarStatusResponseSchema } from "@/server/db/business-schemas";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { z } from "zod";

// Empty query schema since this endpoint takes no query parameters
const QuerySchema = z.object({});

export const GET = handleGetWithQueryAuth(QuerySchema, CalendarStatusResponseSchema, async (query, userId) => {
  return await GoogleCalendarService.getCalendarStatus(userId);
});

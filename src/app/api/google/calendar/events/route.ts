/**
 * GET /api/google/calendar/events — Fetch calendar events
 *
 * Returns calendar events for the authenticated user with business intelligence data.
 */
import { handleGetWithQueryAuth } from "@/lib/api";
import {
  CalendarEventsQuerySchema,
  CalendarEventsResponseSchema,
} from "@/server/db/business-schemas";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { z } from "zod";

export const GET = handleGetWithQueryAuth(
  CalendarEventsQuerySchema,
  CalendarEventsResponseSchema,
  async (query, userId): Promise<z.infer<typeof CalendarEventsResponseSchema>> => {
    return await GoogleCalendarService.getFormattedEvents(userId, query.limit);
  },
);

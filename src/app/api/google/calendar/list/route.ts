/** GET /api/google/calendar/list — fetch user's Google Calendar list (auth required). Errors: 400 invalid_request, 401 Unauthorized, 500 INTERNAL_ERROR */

import { handleGetWithQueryAuth } from "@/lib/api";
import { CalendarListQuerySchema, CalendarListResponseSchema } from "@/server/db/business-schemas";
import { GoogleCalendarService, GoogleAuthError } from "@/server/services/google-calendar.service";

export const GET = handleGetWithQueryAuth(CalendarListQuerySchema, CalendarListResponseSchema, async (query, userId) => {
  try {
    return await GoogleCalendarService.listCalendars(userId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Handle Google Auth errors
    if (error instanceof GoogleAuthError) {
      throw new Error("Calendar authorization expired. Please reconnect.");
    }

    // Handle specific Google API errors
    if (errorMessage.includes("invalid_grant") || errorMessage.includes("unauthorized")) {
      throw new Error("Calendar authorization expired. Please reconnect.");
    }

    if (errorMessage.includes("rate") || errorMessage.includes("quota")) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    if (errorMessage.includes("No valid calendars found")) {
      throw new Error("No valid calendars found");
    }

    throw new Error("Failed to fetch calendar list");
  }
});

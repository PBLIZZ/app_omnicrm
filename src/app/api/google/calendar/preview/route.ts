/**
 * POST /api/google/calendar/preview — Generate preview of Calendar sync data volume
 *
 * Estimates the number of events and data size that would be synced based on user preferences.
 * Does not perform actual sync, only provides estimates for user confirmation.
 */

import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { CalendarPreferencesSchema, SyncPreviewResponseSchema } from "@/lib/validation/schemas/sync";
import { getGoogleCalendarClient } from "@/server/google/client";
import { ensureError } from "@/lib/utils/error-handler";

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "calendar_preview" },
  validation: {
    body: CalendarPreferencesSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("google.calendar.preview", requestId);

  try {
    const calendarClient = await getGoogleCalendarClient(userId);
    if (!calendarClient) {
      return api.error("Google Calendar not connected", "INTEGRATION_ERROR");
    }

    const prefs = validated.body;

    // Calculate date range for preview
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + prefs.futureDays);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - prefs.pastDays);

    let totalEvents = 0;
    const calendarDetails: Array<{
      id: string;
      name: string;
      eventCount: number;
    }> = [];

    // Estimate events for each selected calendar
    for (const calendarId of prefs.selectedCalendarIds) {
      try {
        // First get calendar info
        const calendarInfo = await calendarClient.calendars.get({
          calendarId: calendarId,
        });

        const calendarName = calendarInfo.data.summary || "Unknown Calendar";

        // Get events count for this calendar in the date range
        const eventsResponse = await calendarClient.events.list({
          calendarId: calendarId,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          maxResults: 2500, // Google's max limit
          singleEvents: true,
          orderBy: "startTime",
          showDeleted: false,
        });

        const events = eventsResponse.data.items || [];
        let calendarEventCount = events.length;

        // If we hit the limit, there might be more events
        if (events.length === 2500) {
          // Estimate based on pattern - this is approximate
          calendarEventCount = Math.floor(events.length * 1.2); // Add 20% buffer for unseen events
        }

        calendarDetails.push({
          id: calendarId,
          name: calendarName,
          eventCount: calendarEventCount,
        });

        totalEvents += calendarEventCount;

      } catch (calendarError) {
        console.warn(`Failed to preview calendar ${calendarId}:`, calendarError);
        // Add calendar with 0 events if it fails
        calendarDetails.push({
          id: calendarId,
          name: "Unknown Calendar",
          eventCount: 0,
        });
      }
    }

    // Estimate size based on average event size (approximate 3KB per event including metadata)
    const averageEventSizeKB = 3;
    const estimatedSizeMB = (totalEvents * averageEventSizeKB) / 1024;

    const warnings: string[] = [];

    // Add warnings for large sync operations
    if (totalEvents > 5000) {
      warnings.push("Large number of events detected. Sync may take significant time to complete.");
    }
    if (prefs.pastDays === 365) {
      warnings.push("Full year of past events selected. This is a one-time operation and cannot be changed later.");
    }
    if (prefs.selectedCalendarIds.length > 10) {
      warnings.push("Many calendars selected. Consider selecting only the most important ones.");
    }

    const preview = {
      service: "calendar" as const,
      estimatedItems: totalEvents,
      estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100, // Round to 2 decimal places
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      details: {
        calendars: calendarDetails,
      },
      warnings,
    };

    // Validate response structure
    const validationResult = SyncPreviewResponseSchema.safeParse(preview);
    if (!validationResult.success) {
      console.error("Calendar preview response validation failed:", validationResult.error);
      return api.error("Invalid preview response generated", "INTERNAL_ERROR");
    }

    return api.success(validationResult.data);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Handle specific Calendar API errors
    if (errorMessage.includes("invalid_grant") || errorMessage.includes("unauthorized")) {
      return api.error("Calendar authorization expired. Please reconnect.", "INTEGRATION_ERROR");
    }

    if (errorMessage.includes("rate") || errorMessage.includes("quota")) {
      return api.error("Rate limit exceeded. Please try again later.", "INTERNAL_ERROR");
    }

    return api.error(
      "Failed to generate Calendar sync preview",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
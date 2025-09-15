/** GET /api/google/calendar/list — fetch user's Google Calendar list (auth required). Errors: 400 invalid_request, 401 Unauthorized, 500 INTERNAL_ERROR */

import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getGoogleCalendarClient } from "@/server/google/client";
import type { calendar_v3 } from "googleapis";
import type { CalendarItem } from "@/app/(authorisedRoute)/omni-rhythm/_components/types";
import { z } from "zod";

// Validation schema for CalendarItem
const CalendarItemSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  primary: z.boolean(),
  accessRole: z.string().min(1),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_calendar_list" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("google.calendar.list", requestId);

  try {
    const calendarClient = await getGoogleCalendarClient(userId);
    if (!calendarClient) {
      return api.error("Google Calendar not connected", "INTEGRATION_ERROR");
    }

    const response = await calendarClient.calendarList.list({
      maxResults: 250, // Google's max is 250
      showHidden: false,
      showDeleted: false,
    });

    const rawItems = response.data.items ?? [];
    let processedCount = 0;
    let skippedCount = 0;

    const calendars: CalendarItem[] = rawItems
      .map((item: calendar_v3.Schema$CalendarListEntry) => {
        try {
          const transformedItem = {
            id: item.id ?? "",
            summary: item.summary ?? "Untitled Calendar",
            primary: item.primary ?? false,
            accessRole: item.accessRole ?? "reader",
          };

          // Validate each calendar item
          const validationResult = CalendarItemSchema.safeParse(transformedItem);
          if (!validationResult.success) {
            console.warn(`Skipping invalid calendar item: ${validationResult.error.message}`, {
              itemId: item.id,
              itemSummary: item.summary,
              validationErrors: validationResult.error.errors,
            });
            skippedCount++;
            return null;
          }
          processedCount++;
          return validationResult.data;
        } catch (error) {
          console.warn(
            `Error processing calendar item: ${error instanceof Error ? error.message : "Unknown error"}`,
            {
              itemId: item.id,
              itemSummary: item.summary,
              error: error instanceof Error ? error.stack : error,
            },
          );
          skippedCount++;
          return null;
        }
      })
      .filter((item): item is CalendarItem => item !== null);

    // Log processing summary
    if (skippedCount > 0) {
      console.warn(
        `Calendar list processing: ${processedCount} items processed, ${skippedCount} items skipped out of ${rawItems.length} total`,
      );
    }

    // Check if we have any valid calendars
    if (calendars.length === 0 && rawItems.length > 0) {
      console.error(
        `No valid calendars found after processing ${rawItems.length} items from Google Calendar API`,
      );
      return api.error("No valid calendars found", "INTEGRATION_ERROR");
    }

    // Sort calendars: primary first, then by summary
    calendars.sort((a, b) => {
      if (a.primary && !b.primary) return -1;
      if (!a.primary && b.primary) return 1;
      return a.summary.localeCompare(b.summary);
    });

    return api.success({
      calendars,
      meta: {
        totalProcessed: processedCount,
        totalSkipped: skippedCount,
        totalRequested: rawItems.length,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Handle specific Google API errors
    if (errorMessage.includes("invalid_grant") || errorMessage.includes("unauthorized")) {
      return api.error("Calendar authorization expired. Please reconnect.", "INTEGRATION_ERROR");
    }

    if (errorMessage.includes("rate") || errorMessage.includes("quota")) {
      return api.error("Rate limit exceeded. Please try again later.", "INTERNAL_ERROR");
    }

    return api.error(
      "Failed to fetch calendar list",
      "INTERNAL_ERROR",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
});

import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getGoogleClients } from "@/server/google/client";
import { ensureError } from "@/lib/utils/error-handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "calendar_events" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("calendar_events", requestId);
  try {
    // Check if user has Google Calendar integration
    try {
      await getGoogleClients(userId);
    } catch (error: unknown) {
      const errorObj = error as { status?: number; message?: string };
      if (errorObj?.status === 401 || errorObj?.message === "google_not_connected") {
        return api.success({
          isConnected: false,
          events: [],
        });
      }
      throw error;
    }

    // Get all calendar events from database for BI analysis
    try {
      const { listCalendarEventsService } = await import("@/server/services/calendar.service");

      // Get events from a wider range for BI analysis (last 30 days to next 90 days)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 90);

      const eventsResult = await listCalendarEventsService(userId, {
        limit: 500, // Get more events for BI
        fromDate: startDate,
        toDate: endDate,
      });

      return api.success({
        isConnected: true,
        events: eventsResult.items.map((event) => ({
          id: event.id,
          title: event.title,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          location: event.location,
          eventType: event.eventType,
          businessCategory: event.businessCategory,
          attendees: event.attendees,
        })),
        totalCount: eventsResult.items.length,
      });
    } catch (serviceError) {
      // Return empty data for service errors
      console.error("Calendar service error:", serviceError);
      return api.success({
        isConnected: true,
        events: [],
        totalCount: 0,
      });
    }
  } catch (error) {
    return api.error(
      "Failed to retrieve calendar events",
      "DATABASE_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

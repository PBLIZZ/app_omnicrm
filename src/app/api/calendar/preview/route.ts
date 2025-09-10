import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { google } from "googleapis";
import { ensureError } from "@/lib/utils/error-handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "calendar_preview" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("calendar_preview", requestId);
  try {
    // Get auth and make live Google Calendar API call
    const auth = await GoogleCalendarService.getAuth(userId);
    const calendar = google.calendar({ version: "v3", auth });

    const timeMin = new Date().toISOString();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 30); // 30 days ahead only

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });

    const events = response.data.items ?? [];

    return api.success({
      upcomingEventsCount: events.length,
    });
  } catch (error) {
    // Handle specific Google API errors
    if (error instanceof Error) {
      if (error.message.includes("invalid_grant") || error.message.includes("unauthorized")) {
        return api.error(
          "Google Calendar authentication has expired. Please reconnect.",
          "UNAUTHORIZED",
          undefined,
          error,
        );
      }
    }

    return api.error(
      "Failed to fetch calendar preview",
      "INTEGRATION_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

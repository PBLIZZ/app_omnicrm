/** GET /api/google/calendar/list — fetch user's Google Calendar list (auth required). Errors: 400 invalid_request, 401 Unauthorized, 500 INTERNAL_ERROR */

import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { GoogleCalendarService, GoogleAuthError } from "@/server/services/google-calendar.service";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_calendar_list" },
})(async ({ userId, requestId: _requestId }) => {

  try {
    const result = await GoogleCalendarService.listCalendars(userId);
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Handle Google Auth errors
    if (error instanceof GoogleAuthError) {
      return NextResponse.json({ error: "Calendar authorization expired. Please reconnect." }, { status: 502 });
    }

    // Handle specific Google API errors
    if (errorMessage.includes("invalid_grant") || errorMessage.includes("unauthorized")) {
      return NextResponse.json({ error: "Calendar authorization expired. Please reconnect." }, { status: 502 });
    }

    if (errorMessage.includes("rate") || errorMessage.includes("quota")) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 500 });
    }

    if (errorMessage.includes("No valid calendars found")) {
      return NextResponse.json({ error: "No valid calendars found" }, { status: 502 });
    }

    return NextResponse.json({ error: "Failed to fetch calendar list" }, { status: 500 });
  }
});

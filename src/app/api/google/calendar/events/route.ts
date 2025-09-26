/**
 * GET /api/google/calendar/events — Fetch calendar events
 *
 * Returns calendar events for the authenticated user with business intelligence data.
 */
import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const result = await GoogleCalendarService.getFormattedEvents(userId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET /api/google/calendar/events error:", error);
    console.error("Failed to fetch calendar events:", error);
    return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 });
  }
}
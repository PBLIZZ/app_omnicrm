/**
 * GET /api/google/calendar/events — Fetch calendar events
 *
 * Returns calendar events for the authenticated user with business intelligence data.
 */
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { getDb } from "@/server/db/client";
import { calendarEvents } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_calendar_events" },
})(async ({ userId, requestId: _requestId }) => {
  try {
    const db = await getDb();

    // Fetch calendar events for the user
    const events = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId))
      .orderBy(desc(calendarEvents.startTime))
      .limit(500); // Reasonable limit for calendar events

    // Transform to match expected format
    const transformedEvents = events.map(event => ({
      id: event.id,
      googleEventId: event.googleEventId,
      title: event.title,
      description: event.description,
      startTime: event.startTime?.toISOString(),
      endTime: event.endTime?.toISOString(),
      attendees: event.attendees || [],
      location: event.location,
      status: event.status,
      timeZone: event.timeZone,
      isAllDay: event.isAllDay || false,
      visibility: event.visibility,
      eventType: event.eventType,
      businessCategory: event.businessCategory,
      keywords: event.keywords || [],
    }));

    return NextResponse.json({
      events: transformedEvents,
      isConnected: true,
      totalCount: events.length,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch calendar events:", error);
    return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 });
  }
});
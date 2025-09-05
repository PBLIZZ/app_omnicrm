// src/server/repositories/calendar.repo.ts
import { and, eq, gte, lte, desc } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { calendarEvents } from "@/server/db/schema";

export type CalendarEventItem = {
  id: string;
  userId: string;
  googleEventId: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date;
  timeZone: string | null;
  isAllDay: boolean | null;
  status: string | null;
  visibility: string | null;
  attendees: unknown; // JSONB - attendee data from Google Calendar API
  eventType: string | null;
  businessCategory: string | null;
  lastSynced: Date | null;
  googleUpdated: Date | null;
  createdAt: Date;
};

export type CalendarListParams = {
  limit?: number;
  fromDate?: Date;
  toDate?: Date;
};

export async function listCalendarEvents(
  userId: string,
  params: CalendarListParams = {},
): Promise<{ items: CalendarEventItem[]; total: number }> {
  const dbo = await getDb();

  let whereExpr = eq(calendarEvents.userId, userId);

  // Add date filtering if provided
  if (params.fromDate) {
    const newWhereExpr = and(whereExpr, gte(calendarEvents.startTime, params.fromDate));
    if (!newWhereExpr) {
      throw new Error("Failed to create WHERE expression with fromDate filter");
    }
    whereExpr = newWhereExpr;
  }

  if (params.toDate) {
    const newWhereExpr = and(whereExpr, lte(calendarEvents.startTime, params.toDate));
    if (!newWhereExpr) {
      throw new Error("Failed to create WHERE expression with toDate filter");
    }
    whereExpr = newWhereExpr;
  }

  const limit = params.limit ?? 50;

  // Get events ordered by start time (most recent first)
  const events = await dbo
    .select({
      id: calendarEvents.id,
      userId: calendarEvents.userId,
      googleEventId: calendarEvents.googleEventId,
      title: calendarEvents.title,
      description: calendarEvents.description,
      location: calendarEvents.location,
      startTime: calendarEvents.startTime,
      endTime: calendarEvents.endTime,
      timeZone: calendarEvents.timeZone,
      isAllDay: calendarEvents.isAllDay,
      status: calendarEvents.status,
      visibility: calendarEvents.visibility,
      attendees: calendarEvents.attendees,
      eventType: calendarEvents.eventType,
      businessCategory: calendarEvents.businessCategory,
      lastSynced: calendarEvents.lastSynced,
      googleUpdated: calendarEvents.googleUpdated,
      createdAt: calendarEvents.createdAt,
    })
    .from(calendarEvents)
    .where(whereExpr)
    .orderBy(desc(calendarEvents.startTime))
    .limit(limit);

  // Get total count
  const totalResult = await dbo
    .select({ count: calendarEvents.id })
    .from(calendarEvents)
    .where(whereExpr);

  const total = totalResult.length;

  return {
    items: events.map((event) => ({
      id: event.id,
      userId: event.userId,
      googleEventId: event.googleEventId,
      title: event.title,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
      timeZone: event.timeZone,
      isAllDay: event.isAllDay,
      status: event.status,
      visibility: event.visibility,
      attendees: event.attendees,
      eventType: event.eventType,
      businessCategory: event.businessCategory,
      lastSynced: event.lastSynced,
      googleUpdated: event.googleUpdated,
      createdAt: event.createdAt,
    })),
    total,
  };
}

export async function getUpcomingEventsCount(userId: string): Promise<number> {
  const dbo = await getDb();

  const now = new Date();

  const result = await dbo
    .select({ count: calendarEvents.id })
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.startTime, now),
        eq(calendarEvents.status, "confirmed"),
      ),
    );

  return result.length;
}

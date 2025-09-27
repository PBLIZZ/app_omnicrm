import { eq, and, desc, gte, lte } from "drizzle-orm";
import { calendarEvents } from "../../../src/server/db/schema";
import { getDb } from "./db";
import type { InsertCalendarEvent } from "../../../src/server/db/business-schemas";

// Raw database types (without computed fields)
type RawCalendarEvent = {
  id: string;
  userId: string;
  googleEventId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  attendees: unknown;
  location: string | null;
  status: string | null;
  timeZone: string | null;
  isAllDay: boolean | null;
  visibility: string | null;
  eventType: string | null;
  businessCategory: string | null;
  keywords: unknown;
  googleUpdated: Date | null;
  lastSynced: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Local type aliases for repository layer
type CalendarEventDTO = RawCalendarEvent;
type CreateCalendarEventDTO = InsertCalendarEvent;
type UpdateCalendarEventDTO = Partial<InsertCalendarEvent>;

interface CalendarEventFilters {
  fromDate?: Date;
  toDate?: Date;
  eventType?: string;
  businessCategory?: string;
  status?: string;
}

export class CalendarEventsRepository {
  /**
   * List calendar events for a user with optional filtering
   */
  static async listCalendarEvents(
    userId: string,
    filters?: CalendarEventFilters,
  ): Promise<CalendarEventDTO[]> {
    const db = await getDb();

    // Build conditions array
    const conditions = [eq(calendarEvents.userId, userId)];

    if (filters?.fromDate) {
      conditions.push(gte(calendarEvents.startTime, filters.fromDate));
    }

    if (filters?.toDate) {
      conditions.push(lte(calendarEvents.startTime, filters.toDate));
    }

    if (filters?.eventType) {
      conditions.push(eq(calendarEvents.eventType, filters.eventType));
    }

    if (filters?.businessCategory) {
      conditions.push(eq(calendarEvents.businessCategory, filters.businessCategory));
    }

    if (filters?.status) {
      conditions.push(eq(calendarEvents.status, filters.status));
    }

    const query = db
      .select({
        id: calendarEvents.id,
        userId: calendarEvents.userId,
        googleEventId: calendarEvents.googleEventId,
        title: calendarEvents.title,
        description: calendarEvents.description,
        startTime: calendarEvents.startTime,
        endTime: calendarEvents.endTime,
        attendees: calendarEvents.attendees,
        location: calendarEvents.location,
        status: calendarEvents.status,
        timeZone: calendarEvents.timeZone,
        isAllDay: calendarEvents.isAllDay,
        visibility: calendarEvents.visibility,
        eventType: calendarEvents.eventType,
        businessCategory: calendarEvents.businessCategory,
        keywords: calendarEvents.keywords,
        googleUpdated: calendarEvents.googleUpdated,
        lastSynced: calendarEvents.lastSynced,
        createdAt: calendarEvents.createdAt,
        updatedAt: calendarEvents.updatedAt,
      })
      .from(calendarEvents)
      .where(and(...conditions))
      .orderBy(desc(calendarEvents.startTime));

    const rows = await query;

    return rows.map((row) => row);
  }

  /**
   * Get a single calendar event by ID
   */
  static async getCalendarEventById(
    userId: string,
    eventId: string,
  ): Promise<CalendarEventDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: calendarEvents.id,
        userId: calendarEvents.userId,
        googleEventId: calendarEvents.googleEventId,
        title: calendarEvents.title,
        description: calendarEvents.description,
        startTime: calendarEvents.startTime,
        endTime: calendarEvents.endTime,
        attendees: calendarEvents.attendees,
        location: calendarEvents.location,
        status: calendarEvents.status,
        timeZone: calendarEvents.timeZone,
        isAllDay: calendarEvents.isAllDay,
        visibility: calendarEvents.visibility,
        eventType: calendarEvents.eventType,
        businessCategory: calendarEvents.businessCategory,
        keywords: calendarEvents.keywords,
        googleUpdated: calendarEvents.googleUpdated,
        lastSynced: calendarEvents.lastSynced,
        createdAt: calendarEvents.createdAt,
        updatedAt: calendarEvents.updatedAt,
      })
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, eventId)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  /**
   * Get calendar event by Google Event ID
   */
  static async getCalendarEventByGoogleId(
    userId: string,
    googleEventId: string,
  ): Promise<CalendarEventDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: calendarEvents.id,
        userId: calendarEvents.userId,
        googleEventId: calendarEvents.googleEventId,
        title: calendarEvents.title,
        description: calendarEvents.description,
        startTime: calendarEvents.startTime,
        endTime: calendarEvents.endTime,
        attendees: calendarEvents.attendees,
        location: calendarEvents.location,
        status: calendarEvents.status,
        timeZone: calendarEvents.timeZone,
        isAllDay: calendarEvents.isAllDay,
        visibility: calendarEvents.visibility,
        eventType: calendarEvents.eventType,
        businessCategory: calendarEvents.businessCategory,
        keywords: calendarEvents.keywords,
        googleUpdated: calendarEvents.googleUpdated,
        lastSynced: calendarEvents.lastSynced,
        createdAt: calendarEvents.createdAt,
        updatedAt: calendarEvents.updatedAt,
      })
      .from(calendarEvents)
      .where(
        and(eq(calendarEvents.userId, userId), eq(calendarEvents.googleEventId, googleEventId)),
      )
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  /**
   * Create a new calendar event
   */
  static async createCalendarEvent(
    userId: string,
    data: CreateCalendarEventDTO,
  ): Promise<CalendarEventDTO> {
    const db = await getDb();

    const [newEvent] = await db
      .insert(calendarEvents)
      .values({
        userId: userId,
        googleEventId: data.google_event_id,
        title: data.title,
        description: data.description ?? null,
        startTime: new Date(data.start_time),
        endTime: new Date(data.end_time),
        attendees: data.attendees ?? null,
        location: data.location ?? null,
        status: data.status ?? null,
        timeZone: data.time_zone ?? null,
        isAllDay: data.is_all_day ?? null,
        visibility: data.visibility ?? null,
        eventType: data.event_type ?? null,
        businessCategory: data.business_category ?? null,
        keywords: data.keywords ?? null,
        googleUpdated: data.google_updated ? new Date(data.google_updated) : null,
        lastSynced: new Date(),
      })
      .returning();

    return newEvent;
  }

  /**
   * Update an existing calendar event
   */
  static async updateCalendarEvent(
    userId: string,
    eventId: string,
    data: UpdateCalendarEventDTO,
  ): Promise<CalendarEventDTO | null> {
    const db = await getDb();

    // Convert undefined to null for database nullable fields with exactOptionalPropertyTypes
    const updateValues = {
      updatedAt: new Date(),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.start_time !== undefined && { startTime: new Date(data.start_time) }),
      ...(data.end_time !== undefined && { endTime: new Date(data.end_time) }),
      ...(data.attendees !== undefined && { attendees: data.attendees ?? null }),
      ...(data.location !== undefined && { location: data.location ?? null }),
      ...(data.status !== undefined && { status: data.status ?? null }),
      ...(data.time_zone !== undefined && { timeZone: data.time_zone ?? null }),
      ...(data.is_all_day !== undefined && { isAllDay: data.is_all_day ?? null }),
      ...(data.visibility !== undefined && { visibility: data.visibility ?? null }),
      ...(data.event_type !== undefined && { eventType: data.event_type ?? null }),
      ...(data.business_category !== undefined && {
        businessCategory: data.business_category ?? null,
      }),
      ...(data.keywords !== undefined && { keywords: data.keywords ?? null }),
      ...(data.google_updated !== undefined && {
        googleUpdated: data.google_updated ? new Date(data.google_updated) : null,
      }),
    };

    const [updatedEvent] = await db
      .update(calendarEvents)
      .set(updateValues)
      .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, eventId)))
      .returning();

    if (!updatedEvent) {
      return null;
    }

    return updatedEvent;
  }

  /**
   * Delete a calendar event
   */
  static async deleteCalendarEvent(userId: string, eventId: string): Promise<boolean> {
    const db = await getDb();

    const result = await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, eventId)));

    return result.length > 0;
  }

  /**
   * Bulk upsert calendar events (for sync operations)
   */
  static async upsertCalendarEvents(
    userId: string,
    data: CreateCalendarEventDTO[],
  ): Promise<CalendarEventDTO[]> {
    const results: CalendarEventDTO[] = [];

    for (const eventData of data) {
      // Check if event exists by googleEventId
      const existing = await this.getCalendarEventByGoogleId(userId, eventData.google_event_id);

      if (existing) {
        // Update existing event
        const updated = await this.updateCalendarEvent(userId, existing.id, eventData);
        if (updated) {
          results.push(updated);
        }
      } else {
        // Create new event
        const created = await this.createCalendarEvent(userId, eventData);
        results.push(created);
      }
    }

    return results;
  }

  /**
   * Get events within a date range (useful for calendar views)
   */
  static async getEventsInDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEventDTO[]> {
    const db = await getDb();

    const rows = await db
      .select({
        id: calendarEvents.id,
        userId: calendarEvents.userId,
        googleEventId: calendarEvents.googleEventId,
        title: calendarEvents.title,
        description: calendarEvents.description,
        startTime: calendarEvents.startTime,
        endTime: calendarEvents.endTime,
        attendees: calendarEvents.attendees,
        location: calendarEvents.location,
        status: calendarEvents.status,
        timeZone: calendarEvents.timeZone,
        isAllDay: calendarEvents.isAllDay,
        visibility: calendarEvents.visibility,
        eventType: calendarEvents.eventType,
        businessCategory: calendarEvents.businessCategory,
        keywords: calendarEvents.keywords,
        googleUpdated: calendarEvents.googleUpdated,
        lastSynced: calendarEvents.lastSynced,
        createdAt: calendarEvents.createdAt,
        updatedAt: calendarEvents.updatedAt,
      })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          gte(calendarEvents.startTime, startDate),
          lte(calendarEvents.startTime, endDate),
        ),
      )
      .orderBy(calendarEvents.startTime);

    return rows.map((row) => row);
  }
}

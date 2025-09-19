import { eq, and, desc, gte, lte } from "drizzle-orm";
import { calendarEvents } from "./schema";
import { getDb } from "./db";
import type {
  CalendarEventDTO,
  CreateCalendarEventDTO,
  UpdateCalendarEventDTO,
  CalendarEventFilters
} from "@omnicrm/contracts";
import { CalendarEventDTOSchema } from "@omnicrm/contracts";

export class CalendarEventsRepository {
  /**
   * List calendar events for a user with optional filtering
   */
  static async listCalendarEvents(
    userId: string,
    filters?: CalendarEventFilters
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

    // Validate and transform DB rows to DTOs
    return rows.map(row => CalendarEventDTOSchema.parse(row));
  }

  /**
   * Get a single calendar event by ID
   */
  static async getCalendarEventById(userId: string, eventId: string): Promise<CalendarEventDTO | null> {
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

    return CalendarEventDTOSchema.parse(rows[0]);
  }

  /**
   * Get calendar event by Google Event ID
   */
  static async getCalendarEventByGoogleId(
    userId: string,
    googleEventId: string
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
      .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.googleEventId, googleEventId)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return CalendarEventDTOSchema.parse(rows[0]);
  }

  /**
   * Create a new calendar event
   */
  static async createCalendarEvent(userId: string, data: CreateCalendarEventDTO): Promise<CalendarEventDTO> {
    const db = await getDb();

    const [newEvent] = await db
      .insert(calendarEvents)
      .values({
        userId: userId,
        googleEventId: data.googleEventId,
        title: data.title,
        description: data.description ?? null,
        startTime: data.startTime,
        endTime: data.endTime,
        attendees: data.attendees ?? null,
        location: data.location ?? null,
        status: data.status ?? null,
        timeZone: data.timeZone ?? null,
        isAllDay: data.isAllDay ?? null,
        visibility: data.visibility ?? null,
        eventType: data.eventType ?? null,
        businessCategory: data.businessCategory ?? null,
        keywords: data.keywords ?? null,
        googleUpdated: data.googleUpdated ?? null,
        lastSynced: new Date(),
      })
      .returning();

    return CalendarEventDTOSchema.parse(newEvent);
  }

  /**
   * Update an existing calendar event
   */
  static async updateCalendarEvent(
    userId: string,
    eventId: string,
    data: UpdateCalendarEventDTO
  ): Promise<CalendarEventDTO | null> {
    const db = await getDb();

    // Convert undefined to null for database nullable fields with exactOptionalPropertyTypes
    const updateValues = {
      updatedAt: new Date(),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime !== undefined && { endTime: data.endTime }),
      ...(data.attendees !== undefined && { attendees: data.attendees ?? null }),
      ...(data.location !== undefined && { location: data.location ?? null }),
      ...(data.status !== undefined && { status: data.status ?? null }),
      ...(data.timeZone !== undefined && { timeZone: data.timeZone ?? null }),
      ...(data.isAllDay !== undefined && { isAllDay: data.isAllDay ?? null }),
      ...(data.visibility !== undefined && { visibility: data.visibility ?? null }),
      ...(data.eventType !== undefined && { eventType: data.eventType ?? null }),
      ...(data.businessCategory !== undefined && { businessCategory: data.businessCategory ?? null }),
      ...(data.keywords !== undefined && { keywords: data.keywords ?? null }),
      ...(data.googleUpdated !== undefined && { googleUpdated: data.googleUpdated ?? null }),
    };

    const [updatedEvent] = await db
      .update(calendarEvents)
      .set(updateValues)
      .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, eventId)))
      .returning();

    if (!updatedEvent) {
      return null;
    }

    return CalendarEventDTOSchema.parse(updatedEvent);
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
  static async upsertCalendarEvents(userId: string, data: CreateCalendarEventDTO[]): Promise<CalendarEventDTO[]> {
    const results: CalendarEventDTO[] = [];

    for (const eventData of data) {
      // Check if event exists by googleEventId
      const existing = await this.getCalendarEventByGoogleId(userId, eventData.googleEventId);

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
    endDate: Date
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
          lte(calendarEvents.startTime, endDate)
        )
      )
      .orderBy(calendarEvents.startTime);

    return rows.map(row => CalendarEventDTOSchema.parse(row));
  }
}
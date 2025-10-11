import { eq, and, desc, gte, lte } from "drizzle-orm";
import { calendarEvents, CalendarEvent, CreateCalendarEvent } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { ok, err, DbResult } from "@/lib/utils/result";

// Local type aliases for repository layer
type CalendarEventDTO = CalendarEvent;
type CreateCalendarEventDTO = CreateCalendarEvent;
type UpdateCalendarEventDTO = Partial<CreateCalendarEvent>;

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
  ): Promise<DbResult<CalendarEventDTO[]>> {
    try {
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

      return ok(rows.map((row) => row));
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to list calendar events",
        details: error,
      });
    }
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

    return rows[0] ?? null;
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

    return rows[0] ?? null;
  }

  /**
   * Create a new calendar event
   */
  static async createCalendarEvent(
    userId: string,
    data: CreateCalendarEventDTO,
  ): Promise<DbResult<CalendarEventDTO>> {
    try {
      const db = await getDb();

      const [newEvent] = await db
        .insert(calendarEvents)
        .values({
          userId: userId,
          title: data.title,
          description: data.description ?? null,
          startTime: data.startTime,
          endTime: data.endTime,
          isAllDay: data.isAllDay ?? null,
          timeZone: data.timeZone ?? null,
          location: data.location ?? null,
          status: data.status ?? null,
          visibility: data.visibility ?? null,
          eventType: data.eventType ?? null,
          businessCategory: data.businessCategory ?? null,
          googleEventId: data.googleEventId,
          googleUpdated: data.googleUpdated ?? null,
          lastSynced: data.lastSynced ?? null,
          attendees: data.attendees ?? null,
          keywords: data.keywords ?? null,
        })
        .returning();

      if (!newEvent) {
        return err({
          code: "DB_INSERT_FAILED",
          message: "Failed to create calendar event - no data returned",
        });
      }

      return ok(newEvent);
    } catch (error) {
      return err({
        code: "DB_INSERT_FAILED",
        message: error instanceof Error ? error.message : "Failed to create calendar event",
        details: error,
      });
    }
  }

  /**
   * Update an existing calendar event
   */
  static async updateCalendarEvent(
    userId: string,
    eventId: string,
    data: UpdateCalendarEventDTO,
  ): Promise<DbResult<CalendarEventDTO | null>> {
    try {
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
        ...(data.businessCategory !== undefined && {
          businessCategory: data.businessCategory ?? null,
        }),
        ...(data.keywords !== undefined && { keywords: data.keywords ?? null }),
        ...(data.googleUpdated !== undefined && { googleUpdated: data.googleUpdated ?? null }),
        ...(data.lastSynced !== undefined && { lastSynced: data.lastSynced ?? null }),
      };

      const [updatedEvent] = await db
        .update(calendarEvents)
        .set(updateValues)
        .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, eventId)))
        .returning();

      return ok(updatedEvent || null);
    } catch (error) {
      return err({
        code: "DB_UPDATE_FAILED",
        message: error instanceof Error ? error.message : "Failed to update calendar event",
        details: error,
      });
    }
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
  ): Promise<DbResult<CalendarEventDTO[]>> {
    try {
      const results: CalendarEventDTO[] = [];

      for (const eventData of data) {
        // Check if event exists by googleEventId
        const existing = await this.getCalendarEventByGoogleId(userId, eventData.googleEventId);

        if (existing) {
          // Update existing event
          const updateResult = await this.updateCalendarEvent(userId, existing.id, eventData);
          if (updateResult.success && updateResult.data) {
            results.push(updateResult.data);
          }
        } else {
          // Create new event
          const createResult = await this.createCalendarEvent(userId, eventData);
          if (createResult.success) {
            results.push(createResult.data);
          }
        }
      }

      return ok(results);
    } catch (error) {
      return err({
        code: "DB_UPSERT_FAILED",
        message: error instanceof Error ? error.message : "Failed to upsert calendar events",
        details: error,
      });
    }
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

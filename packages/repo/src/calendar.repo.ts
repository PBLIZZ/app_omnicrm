import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

import type { DbClient } from "@/server/db/client";
import {
  interactions,
  contacts,
  notes,
  tasks,
  goals,
  type CreateInteraction,
} from "@/server/db/schema";

/**
 * Calendar Events Repository
 *
 * Manages calendar events stored in the interactions table with type='calendar_event'.
 * Events are stored with metadata in sourceMeta field including start/end times,
 * location, attendees, and event_type.
 */

export interface CalendarEventMeta {
  startTime: string; // ISO 8601 datetime
  endTime: string; // ISO 8601 datetime
  location?: string;
  description?: string;
  eventType?: string;
  attendees?: string[];
}

export interface CalendarEvent {
  id: string;
  userId: string;
  contactId: string; // Required - matches database schema (NOT NULL)
  type: string;
  subject: string | null;
  bodyText: string | null;
  occurredAt: Date;
  source: string | null;
  sourceId: string;
  sourceMeta: CalendarEventMeta;
  batchId: string | null;
  createdAt: Date | null;
}

export interface CreateCalendarEventData {
  contactId: string; // Required - matches database schema
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  description?: string;
  eventType?: string;
  attendees?: string[];
}

export interface UpdateCalendarEventData {
  title?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  description?: string;
}

export interface AvailabilitySlot {
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  durationMinutes: number;
}

export interface SessionPrepData {
  event: CalendarEvent;
  contact: {
    id: string;
    displayName: string;
    primaryEmail: string | null;
    primaryPhone: string | null;
    photoUrl: string | null;
    healthContext: unknown;
    preferences: unknown;
  } | null;
  recentNotes: Array<{
    id: string;
    contentPlain: string;
    createdAt: Date | null;
  }>;
  pendingTasks: Array<{
    id: string;
    name: string;
    priority: string | null;
    dueDate: string | null;
  }>;
  relatedGoals: Array<{
    id: string;
    name: string;
    status: string | null;
    targetDate: string | null;
  }>;
}

export class CalendarRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Get upcoming calendar events within next N days
   */
  async getUpcomingSessions(
    userId: string,
    daysAhead: number = 7,
    contactId?: string,
    eventType?: string,
  ): Promise<CalendarEvent[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    const conditions = [
      eq(interactions.userId, userId),
      eq(interactions.type, "calendar_event"),
      gte(interactions.occurredAt, now),
      lte(interactions.occurredAt, futureDate),
    ];

    if (contactId) {
      conditions.push(eq(interactions.contactId, contactId));
    }

    // Filter by event type in sourceMeta if provided
    const baseQuery = this.db
      .select()
      .from(interactions)
      .where(and(...conditions))
      .orderBy(asc(interactions.occurredAt));

    const rows = await baseQuery;

    // Filter by event type if provided (from sourceMeta)
    let filteredRows = rows;
    if (eventType) {
      filteredRows = rows.filter((row) => {
        const meta = row.sourceMeta as CalendarEventMeta | null;
        return meta?.eventType === eventType;
      });
    }

    return filteredRows as CalendarEvent[];
  }

  /**
   * Get a single calendar event by ID
   */
  async getEventById(userId: string, eventId: string): Promise<CalendarEvent | null> {
    const rows = await this.db
      .select()
      .from(interactions)
      .where(
        and(
          eq(interactions.userId, userId),
          eq(interactions.id, eventId),
          eq(interactions.type, "calendar_event"),
        ),
      )
      .limit(1);

    return (rows[0] as CalendarEvent | undefined) ?? null;
  }

  /**
   * Create a new calendar event
   */
  async createEvent(
    userId: string,
    data: CreateCalendarEventData,
  ): Promise<CalendarEvent> {
    // Validate that endTime is after startTime
    if (data.endTime <= data.startTime) {
      throw new Error("Event end time must be after start time");
    }

    const sourceMeta: CalendarEventMeta = {
      startTime: data.startTime.toISOString(),
      endTime: data.endTime.toISOString(),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.eventType !== undefined && { eventType: data.eventType }),
      ...(data.attendees !== undefined && { attendees: data.attendees }),
    };

    const interactionData: CreateInteraction & { userId: string } = {
      userId,
      contactId: data.contactId,
      type: "calendar_event",
      subject: data.title,
      bodyText: data.description ?? null,
      occurredAt: data.startTime,
      source: "calendar",
      sourceId: `cal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      sourceMeta,
    };

    const [created] = await this.db.insert(interactions).values(interactionData).returning();

    if (!created) {
      throw new Error("Insert returned no data");
    }

    return created as CalendarEvent;
  }

  /**
   * Update a calendar event
   */
  async updateEvent(
    userId: string,
    eventId: string,
    updates: UpdateCalendarEventData,
  ): Promise<CalendarEvent | null> {
    // First get the existing event to validate and merge metadata
    const existing = await this.getEventById(userId, eventId);
    if (!existing) {
      return null;
    }

    const existingMeta = existing.sourceMeta as CalendarEventMeta;
    const sanitized: Record<string, unknown> = {};

    // Update subject if title provided
    if (updates.title !== undefined) {
      sanitized["subject"] = updates.title;
    }

    // Update occurredAt if startTime provided
    if (updates.startTime !== undefined) {
      sanitized["occurredAt"] = updates.startTime;
    }

    // Update bodyText if description provided
    if (updates.description !== undefined) {
      sanitized["bodyText"] = updates.description ?? null;
    }

    // Build updated sourceMeta
    const updatedMeta: CalendarEventMeta = {
      startTime: updates.startTime?.toISOString() ?? existingMeta.startTime,
      endTime: updates.endTime?.toISOString() ?? existingMeta.endTime,
      ...(updates.location !== undefined
        ? updates.location
          ? { location: updates.location }
          : {}
        : existingMeta.location !== undefined
          ? { location: existingMeta.location }
          : {}),
      ...(updates.description !== undefined
        ? updates.description
          ? { description: updates.description }
          : {}
        : existingMeta.description !== undefined
          ? { description: existingMeta.description }
          : {}),
      ...(existingMeta.eventType !== undefined && { eventType: existingMeta.eventType }),
      ...(existingMeta.attendees !== undefined && { attendees: existingMeta.attendees }),
    };

    // Validate updated times
    const startTime = new Date(updatedMeta.startTime);
    const endTime = new Date(updatedMeta.endTime);
    if (endTime <= startTime) {
      throw new Error("Event end time must be after start time");
    }

    sanitized["sourceMeta"] = updatedMeta;

    if (Object.keys(sanitized).length === 0) {
      return existing;
    }

    const [updated] = await this.db
      .update(interactions)
      .set(sanitized)
      .where(
        and(
          eq(interactions.userId, userId),
          eq(interactions.id, eventId),
          eq(interactions.type, "calendar_event"),
        ),
      )
      .returning();

    return (updated as CalendarEvent | undefined) ?? null;
  }

  /**
   * Delete a calendar event (admin operation)
   */
  async deleteEvent(userId: string, eventId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(interactions)
      .where(
        and(
          eq(interactions.userId, userId),
          eq(interactions.id, eventId),
          eq(interactions.type, "calendar_event"),
        ),
      )
      .returning({ id: interactions.id });

    return deleted.length > 0;
  }

  /**
   * Search calendar events by date range, contact, or type
   */
  async searchEvents(
    userId: string,
    params: {
      startDate?: Date;
      endDate?: Date;
      contactId?: string;
      eventType?: string;
      limit?: number;
    },
  ): Promise<CalendarEvent[]> {
    const conditions = [eq(interactions.userId, userId), eq(interactions.type, "calendar_event")];

    if (params.startDate) {
      conditions.push(gte(interactions.occurredAt, params.startDate));
    }

    if (params.endDate) {
      conditions.push(lte(interactions.occurredAt, params.endDate));
    }

    if (params.contactId) {
      conditions.push(eq(interactions.contactId, params.contactId));
    }

    const limit = params.limit ?? 100;

    const rows = await this.db
      .select()
      .from(interactions)
      .where(and(...conditions))
      .orderBy(asc(interactions.occurredAt))
      .limit(limit);

    // Filter by event type if provided (from sourceMeta)
    let filteredRows = rows;
    if (params.eventType) {
      filteredRows = rows.filter((row) => {
        const meta = row.sourceMeta as CalendarEventMeta | null;
        return meta?.eventType === params.eventType;
      });
    }

    return filteredRows as CalendarEvent[];
  }

  /**
   * Check availability - find free time slots
   * Returns events in the specified time range to check for conflicts
   */
  async getEventsInRange(userId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const conditions = [
      eq(interactions.userId, userId),
      eq(interactions.type, "calendar_event"),
      gte(interactions.occurredAt, startDate),
      lte(interactions.occurredAt, endDate),
    ];

    const rows = await this.db
      .select()
      .from(interactions)
      .where(and(...conditions))
      .orderBy(asc(interactions.occurredAt));

    return rows as CalendarEvent[];
  }

  /**
   * Find available time slots within a date range
   */
  async findAvailability(
    userId: string,
    params: {
      startDate: Date;
      endDate: Date;
      durationMinutes: number;
      timezone?: string;
    }
  ): Promise<AvailabilitySlot[]> {
    // Get all events in range
    const events = await this.getEventsInRange(userId, params.startDate, params.endDate);

    // Build busy slots from events
    const busySlots: Array<{ start: Date; end: Date }> = events.map((event) => {
      const meta = event.sourceMeta as CalendarEventMeta;
      return {
        start: new Date(meta.startTime),
        end: new Date(meta.endTime),
      };
    });

    // Find free slots (using working hours 9am-5pm)
    const freeSlots: AvailabilitySlot[] = [];
    const currentDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);

    while (currentDate < endDate) {
      // Set to 9am
      currentDate.setHours(9, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(17, 0, 0, 0); // 5pm

      while (currentDate < dayEnd) {
        const slotEnd = new Date(currentDate.getTime() + params.durationMinutes * 60 * 1000);

        // Check if this slot conflicts with any busy slot
        const hasConflict = busySlots.some(
          (busy) =>
            (currentDate >= busy.start && currentDate < busy.end) ||
            (slotEnd > busy.start && slotEnd <= busy.end) ||
            (currentDate <= busy.start && slotEnd >= busy.end)
        );

        if (!hasConflict && slotEnd <= dayEnd) {
          freeSlots.push({
            startTime: currentDate.toISOString(),
            endTime: slotEnd.toISOString(),
            durationMinutes: params.durationMinutes,
          });
        }

        // Move to next 30-minute slot
        currentDate.setMinutes(currentDate.getMinutes() + 30);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }

    return freeSlots;
  }

  /**
   * Add attendee to event (stored in sourceMeta)
   */
  async addEventAttendee(
    userId: string,
    eventId: string,
    contactId: string
  ): Promise<CalendarEvent | null> {
    // Get the event
    const event = await this.getEventById(userId, eventId);
    if (!event) return null;

    // Get contact details
    const [contact] = await this.db
      .select({ primaryEmail: contacts.primaryEmail, displayName: contacts.displayName })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .limit(1);

    if (!contact) return null;

    // Update sourceMeta with new attendee
    const meta = event.sourceMeta as CalendarEventMeta;
    const attendees = meta.attendees ?? [];

    // Check if attendee already exists by email
    const attendeeEmail = contact.primaryEmail ?? "";
    if (attendees.includes(attendeeEmail)) {
      return event;
    }

    attendees.push(attendeeEmail);

    const updatedMeta: CalendarEventMeta = {
      startTime: meta.startTime,
      endTime: meta.endTime,
      ...(meta.location !== undefined && { location: meta.location }),
      ...(meta.description !== undefined && { description: meta.description }),
      ...(meta.eventType !== undefined && { eventType: meta.eventType }),
      attendees,
    };

    const [updated] = await this.db
      .update(interactions)
      .set({ sourceMeta: updatedMeta })
      .where(
        and(
          eq(interactions.userId, userId),
          eq(interactions.id, eventId),
          eq(interactions.type, "calendar_event")
        )
      )
      .returning();

    return (updated as CalendarEvent | undefined) ?? null;
  }

  /**
   * Remove attendee from event
   */
  async removeEventAttendee(
    userId: string,
    eventId: string,
    contactId: string
  ): Promise<CalendarEvent | null> {
    // Get the event
    const event = await this.getEventById(userId, eventId);
    if (!event) return null;

    // Get contact email
    const [contact] = await this.db
      .select({ primaryEmail: contacts.primaryEmail })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      .limit(1);

    if (!contact) return null;

    // Update sourceMeta to remove attendee
    const meta = event.sourceMeta as CalendarEventMeta;
    const attendees = (meta.attendees ?? []).filter((email) => email !== contact.primaryEmail);

    const updatedMeta: CalendarEventMeta = {
      startTime: meta.startTime,
      endTime: meta.endTime,
      ...(meta.location !== undefined && { location: meta.location }),
      ...(meta.description !== undefined && { description: meta.description }),
      ...(meta.eventType !== undefined && { eventType: meta.eventType }),
      ...(attendees.length > 0 && { attendees }),
    };

    const [updated] = await this.db
      .update(interactions)
      .set({ sourceMeta: updatedMeta })
      .where(
        and(
          eq(interactions.userId, userId),
          eq(interactions.id, eventId),
          eq(interactions.type, "calendar_event")
        )
      )
      .returning();

    return (updated as CalendarEvent | undefined) ?? null;
  }

  /**
   * Get session preparation data (event + contact context)
   */
  async getSessionPrep(userId: string, eventId: string): Promise<SessionPrepData | null> {
    // Get the event
    const event = await this.getEventById(userId, eventId);
    if (!event) return null;

    // Get contact (always present since contactId is required)
    const [contact] = await this.db
      .select({
        id: contacts.id,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        photoUrl: contacts.photoUrl,
        healthContext: contacts.healthContext,
        preferences: contacts.preferences,
      })
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.id, event.contactId)))
      .limit(1);

    const contactData = contact ?? null;

    // Get recent notes for contact
    const recentNotes = await this.db
      .select({
        id: notes.id,
        contentPlain: notes.contentPlain,
        createdAt: notes.createdAt,
      })
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.contactId, event.contactId)))
      .orderBy(desc(notes.createdAt))
      .limit(5);

    // Get pending tasks for contact (check details JSON for contactId)
    const pendingTasks = await this.db
      .select({
        id: tasks.id,
        name: tasks.name,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, "todo"),
          sql`${tasks.details}->>'contactId' = ${event.contactId}`
        )
      )
      .orderBy(desc(tasks.priority))
      .limit(10);

    // Get related goals for contact
    const relatedGoals = await this.db
      .select({
        id: goals.id,
        name: goals.name,
        status: goals.status,
        targetDate: goals.targetDate,
      })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.contactId, event.contactId)))
      .orderBy(desc(goals.createdAt))
      .limit(5);

    return {
      event,
      contact: contactData,
      recentNotes,
      pendingTasks,
      relatedGoals,
    };
  }
}

export function createCalendarRepository(db: DbClient): CalendarRepository {
  return new CalendarRepository(db);
}

// Calendar Events storage layer
import { getDb } from "@/server/db/client";
import { calendarEvents } from "@/server/db/schema";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import type { CalendarEvent, NewCalendarEvent } from "@/server/db/schema";

// Interface for calendar events used in contact intelligence
export interface CalendarEventData {
  title: string;
  description?: string | null;
  start_time: string;
  location?: string | null;
  event_type?: string | undefined;
  business_category?: string | undefined;
  end_time?: string | undefined;
  attendees?: unknown;
}

// Interface for contact suggestions from calendar attendees
export interface AttendeeAnalysis {
  email: string;
  display_name: string;
  event_count: number;
  last_event_date: string;
  event_titles: string[];
}

export class CalendarStorage {
  // ============ CALENDAR EVENTS ============

  async createCalendarEvent(
    userId: string,
    data: Omit<NewCalendarEvent, "userId">,
  ): Promise<CalendarEvent> {
    const db = await getDb();
    const [event] = await db
      .insert(calendarEvents)
      .values({
        ...data,
        userId,
      })
      .returning();
    if (!event) throw new Error("Failed to create calendar event");
    return event;
  }

  async getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    const db = await getDb();
    return await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId))
      .orderBy(desc(calendarEvents.startTime));
  }

  async getCalendarEvent(eventId: string, userId: string): Promise<CalendarEvent | null> {
    const db = await getDb();
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
    return event ?? null;
  }

  // ============ CONTACT INTELLIGENCE QUERIES ============

  /**
   * Get calendar events for a specific contact by email
   * Uses Drizzle ORM operators for JSONB operations
   */
  async getContactEvents(userId: string, contactEmail: string): Promise<CalendarEventData[]> {
    const db = await getDb();

    const results = await db
      .select({
        title: calendarEvents.title,
        description: calendarEvents.description,
        location: calendarEvents.location,
        start_time: calendarEvents.startTime,
        end_time: calendarEvents.endTime,
        attendees: calendarEvents.attendees,
        event_type: calendarEvents.eventType,
        business_category: calendarEvents.businessCategory,
      })
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), isNotNull(calendarEvents.attendees)))
      .orderBy(desc(calendarEvents.startTime))
      .limit(50);

    // Filter results in JavaScript for email matching since JSONB operations are complex
    const filteredResults = results.filter((row) => {
      if (!row.attendees) return false;
      const attendeesStr = JSON.stringify(row.attendees);
      return attendeesStr.includes(contactEmail);
    });

    // Transform to CalendarEventData format
    return filteredResults.map((row) => {
      const result: CalendarEventData = {
        title: row.title,
        description: row.description,
        location: row.location,
        start_time: row.start_time.toISOString(),
        attendees: row.attendees,
      };
      
      // Only add optional properties if they have values
      if (row.end_time) result.end_time = row.end_time.toISOString();
      if (row.event_type) result.event_type = row.event_type;
      if (row.business_category) result.business_category = row.business_category;
      
      return result;
    });
  }

  // ============ CONTACT SUGGESTION QUERIES ============

  /**
   * Analyze calendar attendees for contact suggestions
   * Uses Drizzle ORM with JavaScript processing for complex JSONB operations
   */
  async getAttendeeAnalysis(userId: string): Promise<AttendeeAnalysis[]> {
    const db = await getDb();

    // Get all events with attendees for the user
    const events = await db
      .select({
        title: calendarEvents.title,
        startTime: calendarEvents.startTime,
        attendees: calendarEvents.attendees,
      })
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), isNotNull(calendarEvents.attendees)));

    // Process attendees in JavaScript to replicate the CTE logic
    const attendeeMap = new Map<
      string,
      {
        email: string;
        display_name: string;
        event_count: number;
        last_event_date: Date;
        event_titles: Set<string>;
      }
    >();

    for (const event of events) {
      if (!event.attendees || !Array.isArray(event.attendees)) continue;

      for (const attendee of event.attendees as Array<{ email?: string; displayName?: string }>) {
        const email = attendee.email?.trim();
        const displayName = attendee.displayName?.trim();

        if (!email || !displayName || email === "" || displayName === "") continue;

        const key = `${email}:${displayName}`;
        const existing = attendeeMap.get(key);

        if (existing) {
          existing.event_count++;
          existing.event_titles.add(event.title);
          if (event.startTime > existing.last_event_date) {
            existing.last_event_date = event.startTime;
          }
        } else {
          attendeeMap.set(key, {
            email,
            display_name: displayName,
            event_count: 1,
            last_event_date: event.startTime,
            event_titles: new Set([event.title]),
          });
        }
      }
    }

    // Convert to array and sort
    const results = Array.from(attendeeMap.values())
      .filter((attendee) => attendee.event_count >= 1)
      .sort((a, b) => {
        if (a.event_count !== b.event_count) {
          return b.event_count - a.event_count;
        }
        return b.last_event_date.getTime() - a.last_event_date.getTime();
      });

    return results.map((attendee) => ({
      email: attendee.email,
      display_name: attendee.display_name,
      event_count: attendee.event_count,
      last_event_date: attendee.last_event_date.toISOString(),
      event_titles: Array.from(attendee.event_titles).sort(),
    }));
  }

  // ============ BASIC CRUD OPERATIONS ============

  async updateCalendarEvent(
    eventId: string,
    userId: string,
    data: Partial<Omit<NewCalendarEvent, "userId">>,
  ): Promise<void> {
    const db = await getDb();
    await db
      .update(calendarEvents)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
  }

  async deleteCalendarEvent(eventId: string, userId: string): Promise<void> {
    const db = await getDb();
    await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
  }
}

export const calendarStorage = new CalendarStorage();

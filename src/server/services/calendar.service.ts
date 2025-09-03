import { GoogleCalendarService, CalendarEvent } from "./google-calendar.service";

export interface ListCalendarEventsOptions {
  limit?: number;
  fromDate?: Date;
  toDate?: Date;
}

export interface ListCalendarEventsResult {
  items: CalendarEvent[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * List calendar events for a user with optional filtering
 */
export async function listCalendarEventsService(
  userId: string,
  options: ListCalendarEventsOptions = {}
): Promise<ListCalendarEventsResult> {
  const { limit = 50, fromDate, toDate } = options;

  let events: CalendarEvent[] = [];

  if (fromDate && toDate) {
    // Get events by date range
    events = await GoogleCalendarService.getEventsByDateRange(userId, fromDate, toDate);
  } else {
    // Get upcoming events
    events = await GoogleCalendarService.getUpcomingEvents(userId, limit);
  }

  // Apply limit if specified and we got more events than requested
  const limitedEvents = limit ? events.slice(0, limit) : events;

  return {
    items: limitedEvents,
    totalCount: events.length,
    hasMore: events.length > limitedEvents.length,
  };
}

/**
 * Get upcoming events for a user
 */
export async function getUpcomingEventsService(
  userId: string,
  limit = 10
): Promise<CalendarEvent[]> {
  return await GoogleCalendarService.getUpcomingEvents(userId, limit);
}

/**
 * Get count of upcoming events for a user
 */
export async function getUpcomingEventsCountService(
  userId: string
): Promise<number> {
  const events = await GoogleCalendarService.getUpcomingEvents(userId, 100); // Get more to count properly
  return events.length;
}

/**
 * Sync calendar events for a user
 */
export async function syncCalendarEventsService(
  userId: string,
  options: {
    daysPast?: number;
    daysFuture?: number;
    maxResults?: number;
    batchId?: string;
  } = {}
): Promise<{
  success: boolean;
  syncedEvents: number;
  error?: string;
}> {
  return await GoogleCalendarService.syncUserCalendars(userId, options);
}

import { google, calendar_v3 } from 'googleapis';
import { getDb } from '@/server/db/client';
import { calendarEvents, userIntegrations } from '@/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { decryptString } from '@/server/lib/crypto';

export class GoogleCalendarService {
  /**
   * Get OAuth2 client for a user
   */
  private static async getAuth(userId: string) {
    const db = await getDb();
    
    // Use raw SQL to avoid Drizzle ORM composite key issues
    const result = await db.execute(sql`
      SELECT access_token, refresh_token, expiry_date 
      FROM user_integrations 
      WHERE user_id = ${userId} 
      AND provider = 'google' 
      AND service = 'calendar' 
      LIMIT 1
    `);

    if (!result.rows[0]) {
      throw new Error('Google Calendar not connected for user');
    }

    const integration = result.rows[0];
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: decryptString(integration.access_token as string),
      refresh_token: integration.refresh_token ? decryptString(integration.refresh_token as string) : null,
      expiry_date: integration.expiry_date ? new Date(integration.expiry_date as string).getTime() : undefined,
    });

    return oauth2Client;
  }

  /**
   * Sync all calendar events for a user
   */
  static async syncUserCalendars(
    userId: string,
    options: {
      daysPast?: number;
      daysFuture?: number;
      maxResults?: number;
    } = {}
  ): Promise<{
    success: boolean;
    syncedEvents: number;
    error?: string;
  }> {
    try {
      const auth = await this.getAuth(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      // Get list of calendars
      const calendarsResponse = await calendar.calendarList.list();
      const calendars = calendarsResponse.data.items || [];

      let totalSyncedEvents = 0;

      // Sync events from each calendar
      for (const cal of calendars) {
        if (!cal.id) continue;

        try {
          const events = await this.syncCalendarEvents(userId, cal.id, calendar, options);
          totalSyncedEvents += events;
        } catch (error) {
          console.error(`Error syncing calendar ${cal.id}:`, error);
          // Continue with other calendars
        }
      }

      return {
        success: true,
        syncedEvents: totalSyncedEvents,
      };
    } catch (error) {
      console.error('Calendar sync error:', error);
      return {
        success: false,
        syncedEvents: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync events from a specific calendar
   */
  private static async syncCalendarEvents(
    userId: string,
    calendarId: string,
    calendar: calendar_v3.Calendar,
    options: {
      daysPast?: number;
      daysFuture?: number;
      maxResults?: number;
    } = {}
  ): Promise<number> {
    // Configurable sync range - defaults to larger window for comprehensive data
    const daysPast = options.daysPast || 180; // 6 months back
    const daysFuture = options.daysFuture || 365; // 1 year ahead
    const maxResults = options.maxResults || 2500; // Google's max
    
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - daysPast);
    
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + daysFuture);

    console.log(`Syncing calendar ${calendarId}: ${daysPast} days past → ${daysFuture} days future (max ${maxResults} events)`);

    const eventsResponse = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults,
    });

    const events = eventsResponse.data.items || [];
    let syncedCount = 0;

    for (const event of events) {
      try {
        await this.upsertCalendarEvent(userId, calendarId, event);
        syncedCount++;
      } catch (error) {
        console.error(`Error upserting event ${event.id}:`, error);
      }
    }

    return syncedCount;
  }

  /**
   * Create or update a calendar event in the database
   */
  private static async upsertCalendarEvent(
    userId: string,
    calendarId: string,
    event: calendar_v3.Schema$Event
  ) {
    if (!event.id || !event.start || !event.end) {
      return; // Skip events without required data
    }

    // Determine start and end times
    const startTime = event.start.dateTime 
      ? new Date(event.start.dateTime)
      : new Date(event.start.date!);
    
    const endTime = event.end.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end.date!);

    const isAllDay = !event.start.dateTime;
    const timeZone = event.start.timeZone || 'UTC';

    // Extract event type and business category using AI
    const { eventType, businessCategory, keywords } = this.classifyEvent(event);

    // Extract attendees information
    const attendees = event.attendees?.map((attendee: any) => ({
      email: attendee.email,
      displayName: attendee.displayName,
      responseStatus: attendee.responseStatus,
      optional: attendee.optional,
    })) || [];

    const eventData = {
      userId,
      googleEventId: event.id,
      calendarId,
      title: event.summary || 'Untitled Event',
      description: event.description || null,
      location: event.location || null,
      startTime,
      endTime,
      timeZone,
      isAllDay,
      recurring: !!event.recurrence,
      recurrenceRule: event.recurrence?.[0] || null,
      status: event.status || 'confirmed',
      visibility: event.visibility || 'public',
      attendees,
      eventType,
      businessCategory,
      keywords,
      googleUpdated: new Date(event.updated!),
      lastSynced: new Date(),
    };

    const db = await getDb();
    
    // Check if event exists using raw SQL
    const existingEvent = await db.execute(sql`
      SELECT id FROM calendar_events 
      WHERE google_event_id = ${event.id} 
      LIMIT 1
    `);

    if (existingEvent.rows.length > 0) {
      // Update existing event using raw SQL - only columns that exist
      await db.execute(sql`
        UPDATE calendar_events 
        SET title = ${eventData.title},
            description = ${eventData.description},
            location = ${eventData.location},
            start_time = ${eventData.startTime},
            end_time = ${eventData.endTime},
            status = ${eventData.status},
            attendees = ${JSON.stringify(eventData.attendees)},
            updated_at = ${new Date()}
        WHERE google_event_id = ${event.id}
      `);
    } else {
      // Insert new event using raw SQL - only columns that exist in the actual table
      await db.execute(sql`
        INSERT INTO calendar_events (
          user_id, google_event_id, title, description, location,
          start_time, end_time, status, attendees, created_at, updated_at
        ) VALUES (
          ${eventData.userId}, ${eventData.googleEventId}, ${eventData.title}, 
          ${eventData.description}, ${eventData.location}, ${eventData.startTime}, 
          ${eventData.endTime}, ${eventData.status}, ${JSON.stringify(eventData.attendees)},
          ${new Date()}, ${new Date()}
        )
      `);
    }
  }

  /**
   * Use AI to classify event type and extract business insights
   */
  private static classifyEvent(event: calendar_v3.Schema$Event): {
    eventType: string;
    businessCategory: string;
    keywords: string[];
  } {
    const title = (event.summary || '').toLowerCase();
    const description = (event.description || '').toLowerCase();
    const location = (event.location || '').toLowerCase();
    const allText = `${title} ${description} ${location}`;

    // Extract keywords
    const keywords = allText
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);

    // Classify event type based on patterns
    let eventType = 'appointment';
    let businessCategory = 'general';

    // Wellness/fitness patterns
    if (/(yoga|meditation|mindfulness|flow|vinyasa|yin|restorative)/i.test(allText)) {
      eventType = 'class';
      businessCategory = 'yoga';
    } else if (/(massage|therapy|treatment|healing|bodywork)/i.test(allText)) {
      eventType = 'appointment';
      businessCategory = 'massage';
    } else if (/(workshop|retreat|training|certification)/i.test(allText)) {
      eventType = 'workshop';
      businessCategory = 'education';
    } else if (/(consultation|session|meeting|1:1|one.on.one)/i.test(allText)) {
      eventType = 'consultation';
      businessCategory = 'personal';
    } else if (/(class|group|series)/i.test(allText)) {
      eventType = 'class';
      businessCategory = 'fitness';
    }

    return { eventType, businessCategory, keywords };
  }

  /**
   * Get upcoming events for a user
   */
  static async getUpcomingEvents(userId: string, limit = 10): Promise<CalendarEvent[]> {
    const db = await getDb();
    const now = new Date();
    
    const result = await db.execute(sql`
      SELECT id, user_id, google_event_id, title, description, location, 
             start_time, end_time, status, attendees, created_at, updated_at
      FROM calendar_events 
      WHERE user_id = ${userId} 
      AND status = 'confirmed' 
      AND start_time > ${now.toISOString()}
      ORDER BY start_time ASC
      LIMIT ${limit}
    `);
    
    // Return simplified calendar event structure matching actual database
    return result.rows.map(row => ({
      id: row.id as string,
      userId: row.user_id as string,
      googleEventId: row.google_event_id as string,
      title: row.title as string,
      description: row.description as string | null,
      location: row.location as string | null,
      startTime: new Date(row.start_time as string),
      endTime: new Date(row.end_time as string),
      status: row.status as string,
      attendees: row.attendees as any,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      // Set defaults for missing columns to maintain type compatibility
      calendarId: 'unknown',
      timeZone: 'UTC',
      isAllDay: false,
      recurring: false,
      recurrenceRule: null,
      visibility: 'public',
      eventType: null,
      capacity: null,
      actualAttendance: null,
      embeddings: null,
      keywords: null,
      businessCategory: null,
      lastSynced: new Date(row.updated_at as string),
      googleUpdated: new Date(row.updated_at as string),
    })) as CalendarEvent[];
  }

  /**
   * Get events by date range
   */
  static async getEventsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const db = await getDb();
    
    const result = await db.execute(sql`
      SELECT id, user_id, google_event_id, title, description, location, 
             start_time, end_time, status, attendees, created_at, updated_at
      FROM calendar_events 
      WHERE user_id = ${userId} 
      AND start_time >= ${startDate.toISOString()}
      AND start_time <= ${endDate.toISOString()}
      ORDER BY start_time ASC
    `);
    
    // Return simplified calendar event structure matching actual database
    return result.rows.map(row => ({
      id: row.id as string,
      userId: row.user_id as string,
      googleEventId: row.google_event_id as string,
      title: row.title as string,
      description: row.description as string | null,
      location: row.location as string | null,
      startTime: new Date(row.start_time as string),
      endTime: new Date(row.end_time as string),
      status: row.status as string,
      attendees: row.attendees as any,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      // Set defaults for missing columns to maintain type compatibility
      calendarId: 'unknown',
      timeZone: 'UTC',
      isAllDay: false,
      recurring: false,
      recurrenceRule: null,
      visibility: 'public',
      eventType: null,
      capacity: null,
      actualAttendance: null,
      embeddings: null,
      keywords: null,
      businessCategory: null,
      lastSynced: new Date(row.updated_at as string),
      googleUpdated: new Date(row.updated_at as string),
    })) as CalendarEvent[];
  }
}

// Import types properly
import type { CalendarEvent } from '@/server/db/schema';
/**
 * Job Creation Service
 *
 * Service for creating background jobs from various data sources
 */

import { getDb } from "@/server/db/client";
import { rawEvents, jobs, calendarEvents } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/observability/unified-logger";

export interface JobCreationResult {
  message: string;
  processed: number;
  totalItems: number;
}

export class JobCreationService {
  /**
   * Create normalize jobs for unprocessed raw events (Gmail)
   */
  static async createRawEventJobs(userId: string): Promise<JobCreationResult> {
    const db = await getDb();

    // Get unprocessed raw events for this user
    const unprocessedEvents = await db
      .select()
      .from(rawEvents)
      .where(eq(rawEvents.userId, userId))
      .limit(50); // Process in batches

    if (unprocessedEvents.length === 0) {
      return {
        message: "No raw events found to process",
        processed: 0,
        totalItems: 0,
      };
    }

    // Create normalize jobs for Gmail events
    const jobsToCreate = unprocessedEvents
      .filter(event => event.provider === 'gmail')
      .map(event => ({
        id: crypto.randomUUID(),
        user_id: userId,
        kind: 'normalize_google_email' as const,
        payload: {
          rawEventId: event.id,
          provider: 'gmail',
        },
        status: 'queued' as const,
        attempts: 0,
        created_at: new Date(),
        updated_at: new Date(),
      }));

    if (jobsToCreate.length > 0) {
      await db.insert(jobs).values(jobsToCreate);
    }

    await logger.info(`Created ${jobsToCreate.length} normalize jobs for raw events`, {
      operation: "manual_raw_events_processor",
      additionalData: {
        userId: userId,
        totalRawEvents: unprocessedEvents.length,
        jobsCreated: jobsToCreate.length,
      },
    });

    return {
      message: `Created ${jobsToCreate.length} normalize jobs from ${unprocessedEvents.length} raw events`,
      processed: jobsToCreate.length,
      totalItems: unprocessedEvents.length,
    };
  }

  /**
   * Create normalize jobs for calendar events
   */
  static async createCalendarEventJobs(userId: string): Promise<JobCreationResult> {
    const db = await getDb();

    // Get calendar events for this user
    const calendarEventsData = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId))
      .limit(50); // Process in batches

    if (calendarEventsData.length === 0) {
      return {
        message: "No calendar events found to process",
        processed: 0,
        totalItems: 0,
      };
    }

    // Create normalize jobs for calendar events
    const jobsToCreate = calendarEventsData.map(event => ({
      id: crypto.randomUUID(),
      user_id: userId,
      kind: 'normalize_google_event' as const,
      payload: {
        calendarEventId: event.id,
        provider: 'calendar',
      },
      status: 'queued' as const,
      attempts: 0,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    if (jobsToCreate.length > 0) {
      await db.insert(jobs).values(jobsToCreate);
    }

    await logger.info(`Created ${jobsToCreate.length} normalize jobs for calendar events`, {
      operation: "manual_calendar_events_processor",
      additionalData: {
        userId: userId,
        totalCalendarEvents: calendarEventsData.length,
        jobsCreated: jobsToCreate.length,
      },
    });

    return {
      message: `Created ${jobsToCreate.length} normalize jobs from ${calendarEventsData.length} calendar events`,
      processed: jobsToCreate.length,
      totalItems: calendarEventsData.length,
    };
  }
}
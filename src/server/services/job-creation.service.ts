/**
 * Job Creation Service
 *
 * Service for creating background jobs from various data sources
 */

import { JobsRepository, RawEventsRepository } from "@repo";
import { getDb } from "@/server/db/client";
import { logger } from "@/lib/observability/unified-logger";

interface JobCreationResult {
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
    const pendingEvents = await RawEventsRepository.findNextPendingEvents(db, userId, 50);

    const gmailEvents = pendingEvents.filter((event) => event.provider === "gmail");

    if (gmailEvents.length === 0) {
      return {
        message: "No raw events found to process",
        processed: 0,
        totalItems: 0,
      };
    }

    const jobsToCreate = gmailEvents.map((event) => ({
      userId,
      kind: "normalize_google_email" as const,
      payload: {
        rawEventId: event.id,
        provider: event.provider,
      },
      batchId: event.batchId ?? null,
    }));

    if (jobsToCreate.length > 0) {
      await JobsRepository.createBulkJobs(db, jobsToCreate);
    }

    await logger.info(`Created ${jobsToCreate.length} normalize jobs for raw events`, {
      operation: "manual_raw_events_processor",
      additionalData: {
        userId: userId,
        totalRawEvents: pendingEvents.length,
        jobsCreated: jobsToCreate.length,
      },
    });

    return {
      message: `Created ${jobsToCreate.length} normalize jobs from ${pendingEvents.length} raw events`,
      processed: jobsToCreate.length,
      totalItems: pendingEvents.length,
    };
  }

  /**
   * Create normalize jobs for calendar events from raw events
   */
  static async createCalendarEventJobs(userId: string): Promise<JobCreationResult> {
    const db = await getDb();
    const pendingEvents = await RawEventsRepository.findNextPendingEvents(db, userId, 50);

    const calendarEvents = pendingEvents.filter((event) => event.provider === "calendar");

    if (calendarEvents.length === 0) {
      return {
        message: "No calendar events found to process",
        processed: 0,
        totalItems: 0,
      };
    }

    const jobsToCreate = calendarEvents.map((event) => ({
      userId,
      kind: "normalize_google_event" as const,
      payload: {
        rawEventId: event.id,
        provider: event.provider,
      },
      batchId: event.batchId ?? null,
    }));

    if (jobsToCreate.length > 0) {
      await JobsRepository.createBulkJobs(db, jobsToCreate);
    }

    await logger.info(`Created ${jobsToCreate.length} normalize jobs for calendar events`, {
      operation: "manual_calendar_events_processor",
      additionalData: {
        userId,
        totalCalendarEvents: calendarEvents.length,
        jobsCreated: jobsToCreate.length,
      },
    });

    return {
      message: `Created ${jobsToCreate.length} normalize jobs from ${calendarEvents.length} calendar events`,
      processed: jobsToCreate.length,
      totalItems: calendarEvents.length,
    };
  }
}

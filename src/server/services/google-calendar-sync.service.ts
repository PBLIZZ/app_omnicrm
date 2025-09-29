/**
 * Google Calendar Sync Service - Business logic for calendar synchronization
 */
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { logger } from "@/lib/observability";
import { randomUUID } from "node:crypto";
import { type Result, ok, err } from "@/lib/utils/result";

export interface SyncCalendarRequest {
  daysPast: number;
  daysFuture: number;
  maxResults: number;
}

export type SyncCalendarResult = Result<
  {
    message: string;
    stats: {
      syncedEvents: number;
      daysPast: number;
      daysFuture: number;
      maxResults: number;
      batchId: string;
    };
  },
  {
    message: string;
    status: number;
  }
>;

export class GoogleCalendarSyncService {
  /**
   * Sync user's Google Calendar events
   */
  static async syncCalendar(
    userId: string,
    params: SyncCalendarRequest
  ): Promise<SyncCalendarResult> {
    try {
      // Check if user has calendar integration
      const hasIntegration = await GoogleCalendarService.hasCalendarIntegration(userId);
      if (!hasIntegration) {
        return err({
          message: "Google Calendar not connected. Please connect your calendar first.",
          status: 400,
        });
      }

      const batchId = randomUUID();
      const { daysPast, daysFuture, maxResults } = params;

      await logger.info("Calendar sync started", {
        operation: "calendar_sync",
        additionalData: {
          userId,
          daysPast,
          daysFuture,
          maxResults,
          batchId,
        },
      });

      // Execute direct calendar sync using the GoogleCalendarService
      const syncResult = await GoogleCalendarService.syncUserCalendars(userId, {
        daysPast,
        daysFuture,
        maxResults,
        batchId,
      });

      if (!syncResult.success) {
        await logger.error("Calendar sync failed", {
          operation: "calendar_sync",
          additionalData: {
            userId,
            batchId,
            error: syncResult.error,
          },
        });

        return err({
          message: typeof syncResult.error === "string" ? syncResult.error : "Failed to sync calendar events",
          status: 502,
        });
      }

      await logger.info("Calendar sync completed", {
        operation: "calendar_sync",
        additionalData: {
          userId,
          batchId,
          syncedEvents: syncResult.syncedEvents,
          daysPast,
          daysFuture,
        },
      });

      return ok({
        message: `Successfully synced ${syncResult.syncedEvents} calendar events`,
        stats: {
          syncedEvents: syncResult.syncedEvents,
          daysPast,
          daysFuture,
          maxResults,
          batchId,
        },
      });
    } catch (syncError) {
      await logger.error(
        "Calendar sync failed",
        {
          operation: "calendar_sync",
          additionalData: { userId },
        },
        syncError instanceof Error ? syncError : new Error(String(syncError)),
      );

      return err({
        message: "Failed to sync calendar events",
        status: 500,
      });
    }
  }
}
/**
 * POST /api/google/calendar/sync — Consolidated Calendar sync endpoint
 *
 * This endpoint directly processes Google Calendar events into raw_events with optimal
 * performance. Replaces the job-based calendar sync with a direct sync approach.
 *
 * Key Features:
 * - Direct sync without background jobs (for immediate processing)
 * - Configurable sync window (past/future days)
 * - Comprehensive error handling and token refresh
 * - Automatic normalization job enqueuing
 * - Rate limiting and auth validation
 */
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { z } from "zod";

// Request schema: configurable sync parameters
const syncSchema = z.object({
  // Days to sync backwards from today
  daysPast: z.number().int().min(1).max(730).optional().default(180), // 6 months default
  // Days to sync forwards from today
  daysFuture: z.number().int().min(1).max(730).optional().default(365), // 1 year default
  // Maximum events to sync per calendar
  maxResults: z.number().int().min(10).max(2500).optional().default(2500),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "calendar_sync" },
  validation: { body: syncSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("google.calendar.sync", requestId);
  const { daysPast, daysFuture, maxResults } = validated.body;

  try {
    const db = await getDb();

    // Verify Calendar integration exists - require explicit calendar service approval
    const integration = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google"),
          eq(userIntegrations.service, "calendar"),
        ),
      )
      .limit(1);

    if (!integration[0]) {
      return api.error(
        "Google Calendar access not approved. Please connect Calendar in Settings.",
        "INTEGRATION_ERROR"
      );
    }

    const batchId = randomUUID();

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
    const result = await GoogleCalendarService.syncUserCalendars(userId, {
      daysPast,
      daysFuture,
      maxResults,
      batchId,
    });

    if (!result.success) {
      await logger.error("Calendar sync failed", {
        operation: "calendar_sync",
        additionalData: {
          userId,
          batchId,
          error: result.error,
        },
      });

      return api.error(
        result.error ?? "Failed to sync calendar events",
        "INTEGRATION_ERROR"
      );
    }

    await logger.info("Calendar sync completed", {
      operation: "calendar_sync",
      additionalData: {
        userId,
        batchId,
        syncedEvents: result.syncedEvents,
        daysPast,
        daysFuture,
      },
    });

    return api.success({
      message: `Successfully synced ${result.syncedEvents} calendar events`,
      stats: {
        syncedEvents: result.syncedEvents,
        daysPast,
        daysFuture,
        maxResults,
        batchId,
      },
    });
  } catch (error) {
    await logger.error(
      "Calendar sync failed",
      {
        operation: "calendar_sync",
        additionalData: { userId },
      },
      ensureError(error),
    );

    return api.error(
      "Failed to sync calendar events",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
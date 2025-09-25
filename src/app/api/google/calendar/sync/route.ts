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
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Validate request body
    const body: unknown = await request.json();
    const validatedBody = syncSchema.parse(body);
    const { daysPast, daysFuture, maxResults } = validatedBody;

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
      return NextResponse.json({
        error: "Google Calendar not connected. Please connect your calendar first.",
      }, { status: 400 });
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

      return NextResponse.json({
        error: typeof syncResult.error === "string" ? syncResult.error : "Failed to sync calendar events",
      }, { status: 502 });
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

    return NextResponse.json({
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
    console.error("POST /api/google/calendar/sync error:", syncError);
    await logger.error(
      "Calendar sync failed",
      {
        operation: "calendar_sync",
        additionalData: { userId: "unknown" },
      },
      ensureError(syncError),
    );

    return NextResponse.json({
      error: "Failed to sync calendar events",
    }, { status: 500 });
  }
}
/**
 * Google Status Service
 *
 * Service for getting Google integration status
 */

import { z } from "zod";
import { getAuthUserId } from "@/lib/auth-simple";
import { getStatusService } from "./google-integration.service";
import { createRawEventsRepository } from "@repo";
import { getDb } from "@/server/db/client";
import { AppError } from "@/lib/errors/app-error";
import { GoogleStatusResponseSchema } from "@/server/db/business-schemas";

/**
 * Get Google services status for authenticated user
 */
export async function getGoogleStatusService(): Promise<
  z.infer<typeof GoogleStatusResponseSchema>
> {
  try {
    const userId = await getAuthUserId();
    const db = await getDb();
    const rawEventsRepo = createRawEventsRepository(db);

    // Get status with auto-refresh
    const statusResult = await getStatusService(userId, {
      autoRefresh: true,
    });

    // Get last sync times from raw_events
    const [gmailLastSync, calendarLastSync] = await Promise.all([
      rawEventsRepo.getLatestEventByProvider(userId, "gmail"),
      rawEventsRepo.getLatestEventByProvider(userId, "calendar"),
    ]);

    // Return simplified response with only fields used in UI
    return {
      gmail: {
        connected: statusResult.gmail.connected,
        lastSync: gmailLastSync?.createdAt?.toISOString() ?? null,
      },
      calendar: {
        connected: statusResult.calendar.connected,
        lastSync: calendarLastSync?.createdAt?.toISOString() ?? null,
      },
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get Google status",
      "GOOGLE_STATUS_ERROR",
      "validation",
      false,
      500,
    );
  }
}

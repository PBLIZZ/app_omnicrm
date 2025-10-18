/**
 * Google Status Service
 *
 * Service for getting Google integration status
 */

import { z } from "zod";
import { getAuthUserId } from "@/lib/auth-simple";
import { getStatusService } from "./google-integration.service";
import { createUserIntegrationsRepository, createRawEventsRepository } from "@repo";
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
    const userIntegrationsRepo = createUserIntegrationsRepository(db);
    const rawEventsRepo = createRawEventsRepository(db);

    // Get status with auto-refresh
    const statusResult = await getStatusService(userId, {
      autoRefresh: true,
    });

    // Get integration details and last sync times
    const [gmailIntegration, calendarIntegration, gmailLastSync, calendarLastSync] =
      await Promise.all([
        userIntegrationsRepo.getUserIntegration(userId, "google", "gmail"),
        userIntegrationsRepo.getUserIntegration(userId, "google", "calendar"),
        rawEventsRepo.getLatestEventByProvider(userId, "gmail"),
        rawEventsRepo.getLatestEventByProvider(userId, "calendar"),
      ]);

    // Build complete response matching GoogleStatusResponseSchema
    return {
      services: {
        gmail: {
          connected: statusResult.gmail.connected,
          autoRefreshed: statusResult.gmail.autoRefreshed ?? false,
          integration: gmailIntegration
            ? {
                service: gmailIntegration.service,
                expiryDate: gmailIntegration.expiryDate?.toISOString() ?? null,
                hasRefreshToken: !!gmailIntegration.refreshToken,
              }
            : null,
          lastSync: gmailLastSync?.createdAt?.toISOString() ?? null,
        },
        calendar: {
          connected: statusResult.calendar.connected,
          autoRefreshed: statusResult.calendar.autoRefreshed ?? false,
          integration: calendarIntegration
            ? {
                service: calendarIntegration.service,
                expiryDate: calendarIntegration.expiryDate?.toISOString() ?? null,
                hasRefreshToken: !!calendarIntegration.refreshToken,
              }
            : null,
          lastSync: calendarLastSync?.createdAt?.toISOString() ?? null,
        },
      },
      features: {
        gmail: statusResult.gmail.connected,
        calendar: statusResult.calendar.connected,
      },
      jobs: {
        queued: 0,
        done: 0,
        error: 0,
      },
      embedJobs: {
        queued: 0,
        done: 0,
        error: 0,
      },
      lastBatchId: null,
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

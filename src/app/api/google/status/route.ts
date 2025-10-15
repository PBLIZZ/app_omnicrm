/**
 * GET /api/google/status
 * Returns connection status for Gmail and Calendar
 * Automatically refreshes expired tokens when status is checked
 */
import { getAuthUserId } from "@/lib/auth-simple";
import { getStatusService } from "@/server/services/google-integration.service";
import { createUserIntegrationsRepository, createRawEventsRepository } from "@repo";
import { getDb } from "@/server/db/client";

export async function GET(): Promise<Response> {
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
    const response = {
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

    return Response.json(response);
  } catch (error) {
    console.error("[Google Status] Error:", error);
    return Response.json({ error: "Failed to get status" }, { status: 500 });
  }
}

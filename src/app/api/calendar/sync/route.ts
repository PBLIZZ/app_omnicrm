import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { enqueue } from "@/server/jobs/enqueue";
import { randomUUID } from "node:crypto";
import { ensureError } from "@/lib/utils/error-handler";

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "calendar_sync" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("calendar_sync", requestId);
  try {
    const db = await getDb();
    // Check for existing integration using Drizzle ORM
    const existing = await db
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

    if (existing.length === 0) {
      return api.error("Google Calendar not connected. Please connect first.", "VALIDATION_ERROR");
    }

    // Trigger actual calendar sync using the service
    const syncResult = await GoogleCalendarService.syncUserCalendars(userId, {
      daysPast: 30,
      daysFuture: 90,
      maxResults: 1000,
    });

    if (syncResult.success) {
      // Enqueue processing jobs for the synced raw events
      const batchId = randomUUID();

      try {
        // Enqueue jobs to process the raw events
        await enqueue("normalize", {}, userId, batchId);
        await enqueue("extract_contacts", { batchId }, userId, batchId);
        await enqueue("embed", { batchId }, userId, batchId);
      } catch (enqueueError) {
        // Continue anyway since raw events were synced successfully - just log the issue
        console.error("Failed to enqueue background jobs:", enqueueError);
      }

      return api.success({
        success: true,
        syncedEvents: syncResult.syncedEvents,
        batchId,
        message: `Successfully synced ${syncResult.syncedEvents} events and enqueued processing jobs`,
      });
    } else {
      return api.error(syncResult.error ?? "Sync failed", "INTEGRATION_ERROR", {
        success: false,
        details: "Check server logs for more information",
      });
    }
  } catch (error) {
    return api.error("Calendar sync failed", "INTEGRATION_ERROR", undefined, ensureError(error));
  }
});

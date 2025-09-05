import { ok, err } from "@/lib/api/http";
import { eq, and } from "drizzle-orm";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { enqueue } from "@/server/jobs/enqueue";
import { randomUUID } from "node:crypto";

// POST: Trigger a sync
export async function POST(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error) {
    return err(401, "unauthorized", {
      details: error instanceof Error ? error.message : "Authentication failed",
    });
  }

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
      return err(400, "not_connected", {
        message: "Google Calendar not connected. Please connect first.",
      });
    }
  } catch (dbError) {
    console.error("Calendar sync POST - database error during integration check:", dbError);
    return err(500, "database_error", {
      message: "Failed to check integration status",
      details: dbError instanceof Error ? dbError.message : "Unknown database error",
    });
  }

  // Trigger actual calendar sync using the service
  try {
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
        console.error("Calendar sync POST - failed to enqueue processing jobs:", enqueueError);
        // Continue anyway since raw events were synced successfully
      }

      return ok({
        success: true,
        syncedEvents: syncResult.syncedEvents,
        batchId,
        message: `Successfully synced ${syncResult.syncedEvents} events and enqueued processing jobs`,
      });
    } else {
      console.error("Calendar sync POST - sync failed:", syncResult.error);
      return err(500, syncResult.error ?? "Sync failed", {
        success: false,
        details: "Check server logs for more information",
      });
    }
  } catch (error) {
    console.error("Calendar sync POST - service exception:", error);
    return err(500, error instanceof Error ? error.message : "Unknown sync error", {
      success: false,
      details: error instanceof Error ? error.stack : "No stack trace available",
    });
  }
}

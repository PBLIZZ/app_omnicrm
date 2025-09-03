import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { enqueue } from "@/server/jobs/enqueue";
import { randomUUID } from "node:crypto";

// POST: Trigger a sync
export async function POST(): Promise<Response> {
  console.log("Calendar sync POST - starting authentication check");
  let userId: string;
  try {
    userId = await getServerUserId();
    console.log("Calendar sync POST - authenticated user:", userId);
  } catch (error) {
    console.log("Calendar sync POST - authentication failed:", error);
    return new NextResponse(
      JSON.stringify({
        error: "unauthorized",
        details: error instanceof Error ? error.message : "Authentication failed",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  console.log("Calendar sync POST - checking for existing integration");
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

    console.log("Calendar sync POST - integration check result:", existing.length > 0);
    if (existing.length === 0) {
      console.log("Calendar sync POST - no integration found, user needs to connect first");
      return new NextResponse(
        JSON.stringify({
          error: "not_connected",
          message: "Google Calendar not connected. Please connect first.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (dbError) {
    console.error("Calendar sync POST - database error during integration check:", dbError);
    return new NextResponse(
      JSON.stringify({
        error: "database_error",
        message: "Failed to check integration status",
        details: dbError instanceof Error ? dbError.message : "Unknown database error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Trigger actual calendar sync using the service
  console.log("Calendar sync POST - triggering calendar sync for user:", userId);
  try {
    const syncResult = await GoogleCalendarService.syncUserCalendars(userId, {
      daysPast: 30,
      daysFuture: 90,
      maxResults: 1000,
    });

    console.log("Calendar sync POST - sync completed:", syncResult);

    if (syncResult.success) {
      console.log("Calendar sync POST - sync successful, events synced:", syncResult.syncedEvents);

      // Enqueue processing jobs for the synced raw events
      const batchId = randomUUID();
      console.log("Calendar sync POST - enqueueing processing jobs with batchId:", batchId);

      try {
        // Enqueue jobs to process the raw events
        await enqueue("normalize", {}, userId, batchId);
        await enqueue("extract_contacts", { batchId }, userId, batchId);
        await enqueue("embed", { batchId }, userId, batchId);

        console.log("Calendar sync POST - successfully enqueued processing jobs");
        console.log("Calendar sync POST - jobs will be processed by cron or manual trigger");
      } catch (enqueueError) {
        console.error("Calendar sync POST - failed to enqueue processing jobs:", enqueueError);
        // Continue anyway since raw events were synced successfully
      }

      return NextResponse.json({
        success: true,
        syncedEvents: syncResult.syncedEvents,
        batchId,
        message: `Successfully synced ${syncResult.syncedEvents} events and enqueued processing jobs`,
      });
    } else {
      console.error("Calendar sync POST - sync failed:", syncResult.error);
      return NextResponse.json(
        {
          success: false,
          error: syncResult.error || "Sync failed",
          details: "Check server logs for more information",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Calendar sync POST - service exception:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
        details: error instanceof Error ? error.stack : "No stack trace available",
      },
      { status: 500 },
    );
  }
}

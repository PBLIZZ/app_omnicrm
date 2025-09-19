import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { rawEvents, jobs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/observability/unified-logger";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * Manual processor for raw_events → interactions transformation
 * Development only - creates normalize jobs for Gmail raw events
 */
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "manual_job_process" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("manual_raw_events_processor", requestId);

  try {
    const db = await getDb();

    // Get unprocessed raw events for this user
    const unprocessedEvents = await db
      .select()
      .from(rawEvents)
      .where(eq(rawEvents.userId, userId))
      .limit(50); // Process in batches

    if (unprocessedEvents.length === 0) {
      return api.success({
        message: "No raw events found to process",
        processed: 0,
      });
    }

    // Create normalize jobs for Gmail events
    const jobsToCreate = unprocessedEvents
      .filter(event => event.provider === 'gmail')
      .map(event => ({
        id: crypto.randomUUID(),
        userId: userId,
        kind: 'normalize_google_email' as const,
        payload: {
          rawEventId: event.id,
          provider: 'gmail',
        },
        status: 'queued' as const,
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

    if (jobsToCreate.length > 0) {
      await db.insert(jobs).values(jobsToCreate);
    }

    await logger.info(`Created ${jobsToCreate.length} normalize jobs for raw events`, {
      operation: "manual_raw_events_processor",
      additionalData: {
        userId: userId,
        totalRawEvents: unprocessedEvents.length,
        jobsCreated: jobsToCreate.length,
      },
    });

    return api.success({
      message: `Created ${jobsToCreate.length} normalize jobs from ${unprocessedEvents.length} raw events`,
      processed: jobsToCreate.length,
      totalRawEvents: unprocessedEvents.length,
    });

  } catch (error) {
    await logger.error(
      "Failed to process raw events",
      {
        operation: "manual_raw_events_processor",
        additionalData: {
          userId: userId,
        },
      },
      ensureError(error),
    );
    
    return api.error(
      "Failed to process raw events",
      "INTERNAL_ERROR",
      { message: error instanceof Error ? error.message : "Unknown error" },
      ensureError(error),
    );
  }
});

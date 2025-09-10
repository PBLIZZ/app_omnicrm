import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { QueueManager } from "@/server/jobs/queue-manager";
import { supabaseServerAdmin } from "@/server/db/supabase/server";
import { z } from "zod";
import { ensureError } from "@/lib/utils/error-handler";

const replayQuerySchema = z.object({
  provider: z.string().default("gmail,google_calendar"),
  days: z
    .string()
    .default("30")
    .transform((val) => parseInt(val, 10)),
  batchSize: z
    .string()
    .default("50")
    .transform((val) => parseInt(val, 10)),
  dryRun: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export const POST = createRouteHandler({
  auth: false, // Using custom admin auth
  validation: {
    query: replayQuerySchema,
  },
  rateLimit: { operation: "admin_replay" },
})(async ({ validated, requestId }) => {
  const api = new ApiResponseBuilder("admin_replay", requestId);

  try {
    // Get authenticated user using admin client
    if (!supabaseServerAdmin) {
      return api.error("Admin client not configured", "INTERNAL_ERROR");
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseServerAdmin.auth.getUser();

    if (authError || !user) {
      return api.unauthorized("Admin authentication required");
    }

    const { provider, days, batchSize, dryRun } = validated.query;

    // Validate parameters
    if (days > 90 || days < 1) {
      return api.validationError("Days must be between 1 and 90");
    }

    if (batchSize > 200 || batchSize < 1) {
      return api.validationError("Batch size must be between 1 and 200");
    }

    const providers = provider.split(",").map((p) => p.trim());
    const validProviders = ["gmail", "google_calendar", "twilio"];
    const invalidProviders = providers.filter((p) => !validProviders.includes(p));

    if (invalidProviders.length > 0) {
      return api.validationError(`Invalid providers: ${invalidProviders.join(", ")}`);
    }

    // Get unprocessed raw events
    const db = await getDb();

    const rawEvents = await db.execute(sql`
      SELECT id, provider, created_at
      FROM raw_events
      WHERE user_id = ${user.id}
        AND provider = ANY(${providers})
        AND created_at >= now() - interval '${days} days'
      ORDER BY created_at ASC
      LIMIT ${Math.min(batchSize * 10, 1000)}
    `);

    if (rawEvents.length === 0) {
      return api.success({
        message: "No events found to replay",
        stats: {
          found: 0,
          queued: 0,
          batchId: null,
        },
      });
    }

    // If dry run, just return what would be processed
    if (dryRun) {
      const providerStats = providers.reduce(
        (stats, p) => {
          stats[p] = rawEvents.filter(
            (e) => (e as Record<string, unknown>)["provider"] === p,
          ).length;
          return stats;
        },
        {} as Record<string, number>,
      );

      return api.success({
        message: "Dry run completed",
        stats: {
          found: rawEvents.length,
          queued: 0,
          providers: providerStats,
          batchId: null,
        },
      });
    }

    // Enqueue processing jobs in batches
    const queueManager = new QueueManager();
    const batchJobs: Array<{
      payload: Record<string, unknown>;
      options?: Record<string, unknown>;
    }> = [];

    for (const rawEvent of rawEvents.slice(0, batchSize)) {
      batchJobs.push({
        payload: { rawEventId: (rawEvent as Record<string, unknown>)["id"] },
        options: { priority: "medium" },
      });
    }

    const jobIds = await queueManager.enqueueBatchJob(user.id, "normalize", batchJobs);

    // Log the replay operation
    await db.execute(sql`
      INSERT INTO sync_audit (user_id, provider, action, payload)
      VALUES (
        ${user.id}, 
        'admin_replay', 
        'bulk_replay',
        ${JSON.stringify({
          providers,
          days,
          batchSize,
          eventsQueued: jobIds.length,
          batchId: jobIds.length > 0 ? (jobIds[0]?.split("_")[0] ?? null) : null,
        })}
      )
    `);

    return api.success({
      message: `Successfully queued ${jobIds.length} events for replay`,
      stats: {
        found: rawEvents.length,
        queued: jobIds.length,
        batchId: jobIds.length > 0 ? (jobIds[0]?.split("_")[0] ?? null) : null,
        jobIds: jobIds.slice(0, 10), // Return first 10 job IDs
      },
    });
  } catch (error) {
    return api.error("Internal server error", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

const statusQuerySchema = z.object({
  batchId: z.string().optional(),
});

export const GET = createRouteHandler({
  auth: false, // Using custom admin auth
  validation: {
    query: statusQuerySchema,
  },
  rateLimit: { operation: "admin_replay_status" },
})(async ({ validated, requestId }) => {
  const api = new ApiResponseBuilder("admin_replay_status", requestId);

  try {
    // Get authenticated user using admin client
    if (!supabaseServerAdmin) {
      return api.error("Admin client not configured", "INTERNAL_ERROR");
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseServerAdmin.auth.getUser();

    if (authError || !user) {
      return api.unauthorized("Admin authentication required");
    }

    const { batchId } = validated.query;

    const db = await getDb();

    // Get overall stats
    const overallStats = await db.execute(sql`
      SELECT 
        provider,
        count(*) as total_events,
        min(created_at) as oldest_event,
        max(created_at) as newest_event
      FROM raw_events
      WHERE user_id = ${user.id}
        AND created_at >= now() - interval '90 days'
      GROUP BY provider
      ORDER BY total_events DESC
    `);

    // Get recent replay operations
    const recentReplays = await db.execute(sql`
      SELECT created_at, action, payload
      FROM sync_audit
      WHERE user_id = ${user.id}
        AND provider = 'admin_replay'
        AND created_at >= now() - interval '7 days'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Get batch status if batchId provided
    let batchStatus = null;
    if (batchId) {
      const queueManager = new QueueManager();
      batchStatus = await queueManager.getBatchStatus(batchId);
    }

    return api.success({
      providerStats: overallStats.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          provider: r["provider"] as string,
          totalEvents: parseInt(r["total_events"] as string, 10),
          oldestEvent: r["oldest_event"] as string,
          newestEvent: r["newest_event"] as string,
        };
      }),
      recentReplays: recentReplays.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          createdAt: r["created_at"] as string,
          action: r["action"] as string,
          payload: r["payload"] as Record<string, unknown>,
        };
      }),
      batchStatus,
    });
  } catch (error) {
    return api.error("Internal server error", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

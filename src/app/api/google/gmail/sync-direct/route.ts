/**
 * POST /api/google/gmail/sync-direct — Direct Gmail sync without background jobs
 *
 * This endpoint directly processes Gmail messages into raw_events without using
 * the job queue system. It's meant for initial sync where the user explicitly
 * clicks "Start Sync" and expects immediate processing.
 */
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { userIntegrations, rawEvents } from "@/server/db/schema";
import { getGoogleClients } from "@/server/google/client";
import { listGmailMessageIds } from "@/server/google/gmail";
import { and, eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { enqueue } from "@/server/jobs/enqueue";
import { z } from "zod";

// Request schema: incremental sync from last successful raw_event by default
const syncDirectSchema = z.object({
  incremental: z.boolean().optional().default(true),
  // Optional overlap to avoid missing messages around boundary
  overlapHours: z.number().int().min(0).max(72).optional().default(0),
  // Fallback lookback window when no last sync exists (e.g., before initial import)
  daysBack: z.number().min(1).max(365).optional(),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_sync_direct" },
  validation: { body: syncDirectSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("google.gmail.sync_direct", requestId);
  const { incremental, overlapHours, daysBack } = validated.body;

  try {
    const db = await getDb();

    // Verify Gmail integration exists
    const integration = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google"),
          eq(userIntegrations.service, "gmail"),
        ),
      )
      .limit(1);

    if (!integration[0]) {
      return api.error("Gmail not connected", "VALIDATION_ERROR");
    }

    // Get Gmail client
    const { gmail } = await getGoogleClients(userId);

    // Determine incremental boundary from last successful raw_event insert (gmail)
    const last = await db
      .select({ createdAt: rawEvents.createdAt })
      .from(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "gmail")))
      .orderBy(desc(rawEvents.createdAt))
      .limit(1);

    let query: string;
    if (incremental && last[0]?.createdAt) {
      const boundary = new Date(last[0].createdAt);
      if (overlapHours && overlapHours > 0) {
        boundary.setHours(boundary.getHours() - overlapHours);
      }
      // Gmail after: uses YYYY/MM/DD (date only). This is safe; duplicates are skipped by upsert.
      const yyyy = boundary.getFullYear();
      const mm = String(boundary.getMonth() + 1).padStart(2, "0");
      const dd = String(boundary.getDate()).padStart(2, "0");
      query = `after:${yyyy}/${mm}/${dd}`;
    } else {
      // Fallback when we don't have a previous sync. Default to 365 if not provided.
      const fallbackDays = daysBack ?? 365;
      query = `newer_than:${fallbackDays}d`;
    }
    const batchId = randomUUID();

    await logger.info("Direct Gmail sync started", {
      operation: "gmail_sync_direct",
      additionalData: {
        userId,
        incremental: Boolean(incremental),
        overlapHours,
        daysBack: daysBack ?? null,
        query,
        batchId,
      },
    });

    // Fetch Gmail message IDs
    const { ids, pages } = await listGmailMessageIds(gmail, query, userId);

    let processed = 0;
    let inserted = 0;
    let errors = 0;

    // Process messages in parallel batches for much faster throughput
    const BATCH_SIZE = 20; // Smaller batches for parallel processing
    const PARALLEL_BATCHES = 5; // Process 5 batches simultaneously
    const totalToProcess = ids.length; // Process ALL emails found (no cap)

    for (let i = 0; i < totalToProcess; i += BATCH_SIZE * PARALLEL_BATCHES) {
      // Create parallel batch promises
      const batchPromises = [];

      for (let j = 0; j < PARALLEL_BATCHES && i + j * BATCH_SIZE < totalToProcess; j++) {
        const startIdx = i + j * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, totalToProcess);
        const batchIds = ids.slice(startIdx, endIdx);

        if (batchIds.length === 0) break;

        // Create promise for this batch
        const batchPromise = Promise.all(
          batchIds.map(async (messageId) => {
            try {
              const response = await gmail.users.messages.get({
                userId: "me",
                id: messageId,
                format: "full",
              });

              const msg = response.data;
              if (!msg) {
                return { success: false, error: "No message data" };
              }

              // Parse email timestamp
              const internalMs = Number(msg.internalDate ?? 0);
              const occurredAt = internalMs ? new Date(internalMs) : new Date();

              // Insert directly into raw_events using Drizzle ORM
              await db
                .insert(rawEvents)
                .values({
                  userId,
                  provider: "gmail",
                  payload: msg,
                  occurredAt,
                  contactId: null,
                  batchId,
                  sourceMeta: {
                    labelIds: msg.labelIds ?? [],
                    fetchedAt: new Date().toISOString(),
                    matchedQuery: query,
                    syncType: "direct_initial",
                  },
                  sourceId: msg.id ?? null,
                })
                .onConflictDoUpdate({
                  target: [rawEvents.userId, rawEvents.provider, rawEvents.sourceId],
                  set: {
                    payload: msg,
                    occurredAt,
                    sourceMeta: {
                      labelIds: msg.labelIds ?? [],
                      fetchedAt: new Date().toISOString(),
                      matchedQuery: query,
                      syncType: "direct_initial",
                    },
                    batchId,
                  },
                });

              return { success: true };
            } catch (error) {
              await logger.warn("Failed to process Gmail message", {
                operation: "gmail_sync_direct",
                additionalData: {
                  userId,
                  messageId,
                  error: error instanceof Error ? error.message : String(error),
                },
              });
              return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
              };
            }
          }),
        );

        batchPromises.push(batchPromise);
      }

      // Wait for all parallel batches to complete
      const batchResults = await Promise.all(batchPromises);

      // Count results
      for (const batchResult of batchResults) {
        for (const result of batchResult) {
          processed++;
          if (result.success) {
            inserted++;
          } else {
            errors++;
          }
        }
      }

      // Small delay between parallel batch groups
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await logger.info("Direct Gmail sync completed", {
      operation: "gmail_sync_direct",
      additionalData: {
        userId,
        batchId,
        totalFound: ids.length,
        processed,
        inserted,
        errors,
        pages,
      },
    });

    // Enqueue normalization jobs for the synced emails
    if (inserted > 0) {
      try {
        await enqueue("normalize", { batchId, provider: "gmail" }, userId, batchId);
      } catch (jobError) {
        // Non-fatal for initial sync; raw events written successfully
        await logger.warn("Failed to enqueue normalization job after Gmail sync", {
          operation: "job_enqueue",
          additionalData: {
            userId,
            batchId,
            inserted,
            error: jobError instanceof Error ? jobError.message : String(jobError),
          },
        });
      }
    }

    return api.success({
      message: `Successfully imported ${inserted} emails from the last ${daysBack} days`,
      stats: {
        totalFound: ids.length,
        processed,
        inserted,
        errors,
        batchId,
      },
    });
  } catch (error) {
    await logger.error(
      "Direct Gmail sync failed",
      {
        operation: "gmail_sync_direct",
        additionalData: { userId },
      },
      ensureError(error),
    );

    return api.error(
      "Failed to sync Gmail messages",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

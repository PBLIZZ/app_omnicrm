/**
 * POST /api/google/gmail/sync — Consolidated Gmail sync endpoint
 *
 * This endpoint directly processes Gmail messages into raw_events with optimal
 * performance. Replaces the scattered sync endpoints with a single, focused route.
 *
 * Key Features:
 * - Direct sync without background jobs (for immediate processing)
 * - Incremental sync from last successful raw_event
 * - Parallel processing for high throughput
 * - Automatic normalization job enqueuing
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
const syncSchema = z.object({
  incremental: z.boolean().optional().default(true),
  // Optional overlap to avoid missing messages around boundary
  overlapHours: z.number().int().min(0).max(72).optional().default(0),
  // Fallback lookback window when no last sync exists
  daysBack: z.number().min(1).max(365).optional(),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_sync" },
  validation: { body: syncSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("google.gmail.sync", requestId);
  const { incremental, overlapHours, daysBack } = validated.body;

  try {
    const db = await getDb();

    // Verify Gmail integration exists (check both gmail-specific and unified)
    const [gmailIntegration, unifiedIntegration] = await Promise.all([
      db
        .select()
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, "gmail"),
          ),
        )
        .limit(1),
      db
        .select()
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, "unified"),
          ),
        )
        .limit(1),
    ]);

    // Use unified integration if available, otherwise use gmail-specific
    const integration = unifiedIntegration[0] ?? gmailIntegration[0];

    if (!integration) {
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
      // Gmail after: uses YYYY/MM/DD (date only). Duplicates are handled by upsert.
      const yyyy = boundary.getFullYear();
      const mm = String(boundary.getMonth() + 1).padStart(2, "0");
      const dd = String(boundary.getDate()).padStart(2, "0");
      query = `after:${yyyy}/${mm}/${dd}`;
    } else {
      // Fallback when no previous sync exists. Default to 365 days if not provided.
      const fallbackDays = daysBack ?? 365;
      query = `newer_than:${fallbackDays}d`;
    }

    const batchId = randomUUID();

    await logger.info("Gmail sync started", {
      operation: "gmail_sync",
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

    // Process messages in parallel batches for optimal throughput
    const BATCH_SIZE = 20; // Optimal batch size for parallel processing
    const PARALLEL_BATCHES = 5; // Process 5 batches simultaneously
    const totalToProcess = ids.length;

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

              // Insert directly into raw_events using upsert for deduplication
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
                    syncType: "consolidated_sync",
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
                      syncType: "consolidated_sync",
                    },
                    batchId,
                  },
                });

              return { success: true };
            } catch (error) {
              await logger.warn("Failed to process Gmail message", {
                operation: "gmail_sync",
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

      // Small delay between parallel batch groups to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await logger.info("Gmail sync completed", {
      operation: "gmail_sync",
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
        // Non-fatal; raw events written successfully
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
      message: `Successfully synced ${inserted} emails`,
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
      "Gmail sync failed",
      {
        operation: "gmail_sync",
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
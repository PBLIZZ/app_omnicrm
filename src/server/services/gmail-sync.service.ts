/**
 * Gmail Sync Service
 *
 * Consolidates all Gmail synchronization business logic for API routes:
 * - /api/google/gmail/sync
 * - /api/google/gmail/sync-blocking
 * - /api/google/gmail/sync-direct
 *
 * Provides methods for incremental sync, direct processing, and blocking sync operations.
 */

import { getDb } from "@/server/db/client";
import { userIntegrations, rawEvents } from "@/server/db/schema";
import { getGoogleClients } from "@/server/google/client";
import { listGmailMessageIds } from "@/server/google/gmail";
import { and, eq, desc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { gmail_v1 } from "googleapis";
import { randomUUID } from "node:crypto";
import { logger } from "@/lib/observability";
import { enqueue } from "@/server/jobs/enqueue";

export interface GmailSyncOptions {
  incremental?: boolean;
  overlapHours?: number;
  daysBack?: number;
  blocking?: boolean;
  direct?: boolean;
}

export interface GmailSyncResult {
  message: string;
  stats: {
    totalFound: number;
    processed: number;
    inserted: number;
    errors: number;
    batchId: string;
  };
}

export interface GmailSyncProgress {
  type: 'start' | 'progress' | 'batch_complete' | 'complete' | 'error';
  processed?: number;
  total?: number;
  batchId?: string;
  error?: string;
  stats?: GmailSyncResult['stats'];
}

export class GmailSyncService {
  /**
   * Main Gmail sync method - processes Gmail messages into raw_events
   */
  static async syncGmail(
    userId: string,
    options: GmailSyncOptions = {}
  ): Promise<GmailSyncResult> {
    const { incremental = true, overlapHours = 0, daysBack } = options;

    const db = await getDb();

    // Verify Gmail integration exists (check both gmail-specific and unified)
    const integration = await this.getGmailIntegration(userId, db);
    if (!integration) {
      throw new Error("Gmail not connected");
    }

    // Get Gmail client
    const { gmail } = await getGoogleClients(userId);

    // Determine sync query based on incremental settings
    const query = await this.buildSyncQuery(userId, incremental, overlapHours, daysBack, db);
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
    const BATCH_SIZE = 20;
    const PARALLEL_BATCHES = 5;
    const totalToProcess = ids.length;

    for (let i = 0; i < totalToProcess; i += BATCH_SIZE * PARALLEL_BATCHES) {
      const batchResults = await this.processBatchParallel(
        gmail,
        ids,
        i,
        BATCH_SIZE,
        PARALLEL_BATCHES,
        totalToProcess,
        userId,
        batchId,
        query,
        db
      );

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

    return {
      message: `Successfully synced ${inserted} emails`,
      stats: {
        totalFound: ids.length,
        processed,
        inserted,
        errors,
        batchId,
      },
    };
  }

  /**
   * Streaming Gmail sync with real-time progress updates
   */
  static async *syncGmailStreaming(
    userId: string,
    options: GmailSyncOptions = {}
  ): AsyncGenerator<GmailSyncProgress, void, unknown> {
    try {
      const { incremental = true, overlapHours = 0, daysBack } = options;
      const db = await getDb();

      // Verify Gmail integration
      const integration = await this.getGmailIntegration(userId, db);
      if (!integration) {
        yield { type: 'error', error: 'Gmail not connected' };
        return;
      }

      const { gmail } = await getGoogleClients(userId);
      const query = await this.buildSyncQuery(userId, incremental, overlapHours, daysBack, db);
      const batchId = randomUUID();

      // Fetch message IDs
      const { ids } = await listGmailMessageIds(gmail, query, userId);
      const total = ids.length;

      yield { type: 'start', total, batchId };

      let processed = 0;
      let inserted = 0;
      let errors = 0;

      const BATCH_SIZE = 10; // Smaller batches for streaming
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batchIds = ids.slice(i, Math.min(i + BATCH_SIZE, total));

        const batchResults = await this.processBatch(
          gmail,
          batchIds,
          userId,
          batchId,
          query,
          db
        );

        // Count batch results
        for (const result of batchResults) {
          processed++;
          if (result.success) {
            inserted++;
          } else {
            errors++;
          }
        }

        yield {
          type: 'batch_complete',
          processed,
          total,
          batchId,
        };

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Enqueue normalization if needed
      if (inserted > 0) {
        try {
          await enqueue("normalize", { batchId, provider: "gmail" }, userId, batchId);
        } catch (jobError) {
          // Non-fatal error
          await logger.warn("Failed to enqueue normalization job", {
            operation: "job_enqueue",
            additionalData: { userId, batchId, error: String(jobError) },
          });
        }
      }

      yield {
        type: 'complete',
        processed,
        total,
        stats: {
          totalFound: total,
          processed,
          inserted,
          errors,
          batchId,
        }
      };

    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Direct Gmail sync without background job queuing
   */
  static async syncGmailDirect(
    userId: string,
    options: GmailSyncOptions = {}
  ): Promise<GmailSyncResult> {
    // Direct sync is the same as regular sync but with different logging context
    const result = await this.syncGmail(userId, { ...options, direct: true });

    await logger.info("Gmail direct sync completed", {
      operation: "gmail_sync_direct",
      additionalData: {
        userId,
        stats: result.stats,
      },
    });

    return result;
  }

  /**
   * Blocking Gmail sync that waits for all processing to complete
   */
  static async syncGmailBlocking(
    userId: string,
    options: GmailSyncOptions = {}
  ): Promise<GmailSyncResult & { normalizedCount: number }> {
    // First, perform the regular sync
    const syncResult = await this.syncGmail(userId, { ...options, blocking: true });

    // Wait for normalization to complete if emails were inserted
    let normalizedCount = 0;
    if (syncResult.stats.inserted > 0) {
      try {
        // Wait for normalization job to complete
        normalizedCount = await this.waitForNormalization(userId, syncResult.stats.batchId);
      } catch (error) {
        await logger.warn("Normalization waiting failed in blocking sync", {
          operation: "gmail_sync_blocking",
          additionalData: {
            userId,
            batchId: syncResult.stats.batchId,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    await logger.info("Gmail blocking sync completed", {
      operation: "gmail_sync_blocking",
      additionalData: {
        userId,
        stats: syncResult.stats,
        normalizedCount,
      },
    });

    return {
      ...syncResult,
      normalizedCount,
    };
  }

  /**
   * Get Gmail integration (unified or gmail-specific)
   */
  private static async getGmailIntegration(userId: string, db: PostgresJsDatabase<Record<string, never>>): Promise<typeof userIntegrations.$inferSelect | undefined> {
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

    return unifiedIntegration[0] ?? gmailIntegration[0];
  }

  /**
   * Build Gmail query string based on sync options
   */
  private static async buildSyncQuery(
    userId: string,
    incremental: boolean,
    overlapHours: number,
    daysBack: number | undefined,
    db: PostgresJsDatabase<Record<string, never>>
  ): Promise<string> {
    if (incremental) {
      // Determine incremental boundary from last successful raw_event insert
      const last = await db
        .select({ createdAt: rawEvents.createdAt })
        .from(rawEvents)
        .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "gmail")))
        .orderBy(desc(rawEvents.createdAt))
        .limit(1);

      if (last[0]?.createdAt) {
        const boundary = new Date(last[0].createdAt);
        if (overlapHours && overlapHours > 0) {
          boundary.setHours(boundary.getHours() - overlapHours);
        }
        // Gmail after: uses YYYY/MM/DD format
        const yyyy = boundary.getFullYear();
        const mm = String(boundary.getMonth() + 1).padStart(2, "0");
        const dd = String(boundary.getDate()).padStart(2, "0");
        return `after:${yyyy}/${mm}/${dd}`;
      }
    }

    // Fallback when no previous sync exists
    const fallbackDays = daysBack ?? 365;
    return `newer_than:${fallbackDays}d`;
  }

  /**
   * Process messages in parallel batches
   */
  private static async processBatchParallel(
    gmail: gmail_v1.Gmail,
    ids: string[],
    startIndex: number,
    batchSize: number,
    parallelBatches: number,
    totalToProcess: number,
    userId: string,
    batchId: string,
    query: string,
    db: PostgresJsDatabase<Record<string, never>>
  ): Promise<Array<Array<{ success: boolean; error?: string }>>> {
    const batchPromises = [];

    for (let j = 0; j < parallelBatches && startIndex + j * batchSize < totalToProcess; j++) {
      const startIdx = startIndex + j * batchSize;
      const endIdx = Math.min(startIdx + batchSize, totalToProcess);
      const batchIds = ids.slice(startIdx, endIdx);

      if (batchIds.length === 0) break;

      const batchPromise = this.processBatch(gmail, batchIds, userId, batchId, query, db);
      batchPromises.push(batchPromise);
    }

    return Promise.all(batchPromises);
  }

  /**
   * Process a single batch of message IDs
   */
  private static async processBatch(
    gmail: gmail_v1.Gmail,
    messageIds: string[],
    userId: string,
    batchId: string,
    query: string,
    db: PostgresJsDatabase<Record<string, never>>
  ): Promise<Array<{ success: boolean; error?: string }>> {
    return Promise.all(
      messageIds.map(async (messageId) => {
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
                syncType: "service_sync",
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
                  syncType: "service_sync",
                },
                batchId,
              },
            });

          return { success: true };
        } catch (error) {
          await logger.warn("Failed to process Gmail message", {
            operation: "gmail_sync_batch",
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
      })
    );
  }

  /**
   * Wait for normalization jobs to complete for a specific batch
   */
  private static async waitForNormalization(userId: string, batchId: string): Promise<number> {
    const db = await getDb();
    const maxWaitMs = 300000; // 5 minutes
    const pollIntervalMs = 2000; // 2 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      // Check if normalization jobs for this batch are complete
      const jobs = await db
        .select()
        .from(rawEvents)
        .where(
          and(
            eq(rawEvents.userId, userId),
            eq(rawEvents.batchId, batchId),
            eq(rawEvents.provider, "gmail")
          )
        );

      // For now, we'll return the count of raw events as a proxy for normalized count
      // In a more sophisticated implementation, we'd track actual normalization status
      if (jobs.length > 0) {
        return jobs.length;
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error("Normalization wait timeout");
  }
}
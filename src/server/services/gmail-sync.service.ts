/**
 * Gmail Sync Service (server-only)
 *
 * Responsibilities:
 * - Fetch Gmail message IDs for a time range (incremental or full)
 * - Fetch each message and upsert into raw_events (dedup on userId+provider+sourceId)
 * - Enqueue normalization job for inserted emails (background processing)
 * - Test and bulk ingestion helpers (merged from former gmail-ingestion.service.ts)
 *
 * Notes:
 * - Uses GoogleGmailService.getAuth() as the single source of truth for auth/refresh.
 * - SSE/streaming removed.
 * - "Blocking" removed. API/UI can poll job status separately.
 * - Standardized on RawEventsRepository (no direct Drizzle access here).
 */

import { google, gmail_v1 } from "googleapis";
import { randomUUID } from "node:crypto";
import { logger } from "@/lib/observability";
import { enqueue } from "@/server/jobs/enqueue";
import { GoogleGmailService } from "@/server/services/google-gmail.service";
import { listGmailMessageIds } from "@/server/google/gmail";

import { RawEventsRepository } from "@repo";
import type {
  CreateRawEventDTO,
  GmailIngestionResultDTO,
} from "@/server/db/business-schemas/gmail";
import { Result, ok, err } from "@/lib/utils/result";

// -------------------------------
// Public types
// -------------------------------

export interface GmailSyncOptions {
  /**
   * Incremental sync uses the last raw_event.createdAt boundary.
   * If false, falls back to a wider window (daysBack).
   */
  incremental?: boolean;
  /**
   * Overlap hours to move boundary backwards to avoid gaps.
   */
  overlapHours?: number;
  /**
   * Days to look back when not incremental (default 365).
   */
  daysBack?: number;
  /**
   * For logging context. No behavioral difference except telemetry.
   */
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

// -------------------------------
// Service
// -------------------------------

export class GmailSyncService {
  /**
   * Standard/background Gmail sync.
   * - Writes raw_events (via Repository)
   * - Enqueues normalization job (background)
   */
  static async syncGmail(userId: string, options: GmailSyncOptions = {}): Promise<GmailSyncResult> {
    const { incremental = true, overlapHours = 0, daysBack } = options;

    // ---- Auth & client via single source of truth
    const auth = await GoogleGmailService.getAuth(userId);
    const gmail = google.gmail({ version: "v1", auth });

    // ---- Build query window
    const query = await this.buildSyncQuery(userId, incremental, overlapHours, daysBack);
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
        mode: options.direct ? "direct" : "background",
      },
    });

    // ---- List message IDs
    const { ids, pages } = await listGmailMessageIds(gmail, query, userId);
    const totalToProcess = ids.length;

    let processed = 0;
    let inserted = 0;
    let errors = 0;

    // Reasonable defaults; tuned to avoid API rate issues
    const BATCH_SIZE = 20;
    const PARALLEL_BATCHES = 5;

    for (let i = 0; i < totalToProcess; i += BATCH_SIZE * PARALLEL_BATCHES) {
      const groups = await this.processBatchParallel(
        gmail,
        ids,
        i,
        BATCH_SIZE,
        PARALLEL_BATCHES,
        totalToProcess,
        userId,
        batchId,
        query,
      );

      for (const group of groups) {
        processed += group.processed;
        inserted += group.inserted;
        errors += group.errors;
      }

      // Light pacing to be nice to Gmail quotas
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
        mode: options.direct ? "direct" : "background",
      },
    });

    // ---- Enqueue normalization for newly inserted emails (best-effort)
    if (inserted > 0) {
      try {
        await enqueue("normalize_google_email", { batchId, provider: "gmail" }, userId, batchId);
      } catch (e) {
        await logger.warn("Failed to enqueue normalization job after Gmail sync", {
          operation: "job_enqueue",
          additionalData: {
            userId,
            batchId,
            inserted,
            error: e instanceof Error ? e.message : String(e),
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
   * Direct Gmail sync (same behavior; separate log context).
   * Keep this for explicit "Run now" UX or CLI invocations.
   */
  static async syncGmailDirect(
    userId: string,
    options: GmailSyncOptions = {},
  ): Promise<GmailSyncResult> {
    const result = await this.syncGmail(userId, { ...options, direct: true });

    await logger.info("Gmail direct sync completed", {
      operation: "gmail_sync_direct",
      additionalData: { userId, stats: result.stats },
    });

    return result;
  }

  // ------------------------------------------------------------------
  // Ingestion helpers (merged from former gmail-ingestion.service.ts)
  // ------------------------------------------------------------------

  /**
   * Test Gmail ingestion - fetch 10 newest messages and insert via repository.
   */
  static async testGmailIngestion(
    userId: string,
  ): Promise<Result<GmailIngestionResultDTO, string>> {
    await logger.info("Starting Gmail ingest test", {
      operation: "gmail_ingestion_service.test",
      additionalData: { userId: this.mask(userId), messageLimit: 10 },
    });

    try {
      const auth = await GoogleGmailService.getAuth(userId);
      const gmail = google.gmail({ version: "v1", auth });

      const listResponse = await gmail.users.messages.list({ userId: "me", maxResults: 10 });
      const messageIds = listResponse.data.messages?.map((m) => m.id).filter(Boolean) ?? [];

      const results = await this.fetchAndInsertMessages(gmail, messageIds, userId, undefined, {
        testIngestion: true,
      });

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      await logger.info("Gmail ingest completed", {
        operation: "gmail_ingestion_service.test",
        additionalData: {
          userId: this.mask(userId),
          totalMessages: messageIds.length,
          successCount,
          failureCount,
        },
      });

      return ok({
        totalMessages: messageIds.length,
        successCount,
        failureCount,
        results,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error(
        "Gmail ingest failed",
        {
          operation: "gmail_ingestion_service.test",
          additionalData: { userId: this.mask(userId), error: errorMsg },
        },
        error instanceof Error ? error : undefined,
      );
      return err(errorMsg);
    }
  }

  /**
   * Bulk Gmail ingestion (explicit), optional query and batchId.
   */
  static async bulkGmailIngestion(
    userId: string,
    options: { maxResults?: number; query?: string; batchId?: string } = {},
  ): Promise<Result<GmailIngestionResultDTO, string>> {
    const { maxResults = 100, query, batchId } = options;

    await logger.info("Starting bulk Gmail ingestion", {
      operation: "gmail_ingestion_service.bulk",
      additionalData: { userId: this.mask(userId), maxResults, query, batchId },
    });

    try {
      const auth = await GoogleGmailService.getAuth(userId);
      const gmail = google.gmail({ version: "v1", auth });

      const listParams: { userId: string; maxResults: number; q?: string } = {
        userId: "me",
        maxResults,
      };
      if (query) listParams.q = query;

      const listResponse = await gmail.users.messages.list(listParams);
      const messageIds = listResponse.data.messages?.map((m) => m.id).filter(Boolean) ?? [];

      const results = await this.fetchAndInsertMessages(gmail, messageIds, userId, batchId, {
        bulkIngestion: true,
      });

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      await logger.info("Bulk Gmail ingestion completed", {
        operation: "gmail_ingestion_service.bulk",
        additionalData: {
          userId: this.mask(userId),
          totalMessages: messageIds.length,
          successCount,
          failureCount,
          batchId,
        },
      });

      return ok({
        totalMessages: messageIds.length,
        successCount,
        failureCount,
        results,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error(
        "Bulk Gmail ingestion failed",
        {
          operation: "gmail_ingestion_service.bulk",
          additionalData: { userId: this.mask(userId), error: errorMsg },
        },
        error instanceof Error ? error : undefined,
      );
      return err(errorMsg);
    }
  }

  /**
   * Get ingestion statistics for a user.
   */
  static async getIngestionStats(
    userId: string,
    provider: string = "gmail",
  ): Promise<
    Result<{ totalEvents: number; recentEvents: number; lastIngestionAt: Date | null }, string>
  > {
    try {
      const totalEvents = await RawEventsRepository.countRawEvents(userId, {
        provider: [provider],
      });

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentEvents = await RawEventsRepository.countRawEvents(userId, {
        provider: [provider],
        occurredAfter: yesterday,
      });

      const recentEventsList = await RawEventsRepository.listRawEvents(
        userId,
        { provider: [provider] },
        1,
      );
      const lastIngestionAt =
        recentEventsList.length > 0 ? (recentEventsList[0]?.createdAt ?? null) : null;

      return ok({ totalEvents, recentEvents, lastIngestionAt });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error(
        "Failed to get ingestion stats",
        {
          operation: "gmail_ingestion_service.stats",
          additionalData: { userId: this.mask(userId), provider, error: errorMsg },
        },
        error instanceof Error ? error : undefined,
      );
      return err(errorMsg);
    }
  }

  // -----------------------------
  // Internals
  // -----------------------------

  /**
   * Build Gmail query string based on sync options.
   * - Incremental: boundary from last raw_event.createdAt (with overlap).
   * - Fallback: newer_than:{daysBack}d
   */
  private static async buildSyncQuery(
    userId: string,
    incremental: boolean,
    overlapHours: number,
    daysBack: number | undefined,
  ): Promise<string> {
    if (incremental) {
      // Use repository to find the latest raw_event for Gmail
      const latest = await RawEventsRepository.listRawEvents(userId, { provider: ["gmail"] }, 1);
      const createdAt = latest[0]?.createdAt;

      if (createdAt) {
        const boundary = new Date(createdAt);
        if (overlapHours && overlapHours > 0) {
          boundary.setHours(boundary.getHours() - overlapHours);
        }
        // Gmail after:YYYY/MM/DD (day-resolution)
        const yyyy = boundary.getFullYear();
        const mm = String(boundary.getMonth() + 1).padStart(2, "0");
        const dd = String(boundary.getDate()).padStart(2, "0");
        return `after:${yyyy}/${mm}/${dd}`;
      }
    }

    const fallbackDays = daysBack ?? 365;
    return `newer_than:${fallbackDays}d`;
  }

  /**
   * Process multiple small batches in parallel (to balance throughput vs. quota).
   * Each parallel unit fetches messages, then attempts a bulk upsert via repository.
   * On bulk failure, it falls back to per-message insert to compute accurate stats.
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
  ): Promise<Array<{ processed: number; inserted: number; errors: number }>> {
    const tasks: Array<Promise<{ processed: number; inserted: number; errors: number }>> = [];

    for (let j = 0; j < parallelBatches && startIndex + j * batchSize < totalToProcess; j++) {
      const start = startIndex + j * batchSize;
      const end = Math.min(start + batchSize, totalToProcess);
      const slice = ids.slice(start, end);
      if (slice.length === 0) break;

      tasks.push(this.processBatch(gmail, slice, userId, batchId, query));
    }

    return Promise.all(tasks);
  }

  /**
   * Process a single batch of message IDs.
   */
  private static async processBatch(
    gmail: gmail_v1.Gmail,
    messageIds: string[],
    userId: string,
    batchId: string | undefined,
    query: string,
  ): Promise<{ processed: number; inserted: number; errors: number }> {
    const createPayloads: Array<CreateRawEventDTO & { userId: string }> = [];
    let processed = 0;
    let inserted = 0;
    let errors = 0;

    // Fetch full messages
    for (const messageId of messageIds) {
      try {
        const response = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full",
        });

        const msg = response.data as gmail_v1.Schema$Message & {
          internalDate?: string | null;
          labelIds?: string[] | null;
        };

        if (!msg) {
          errors++;
          continue;
        }

        // OccurredAt from internalDate (ms)
        const internalMs = Number(msg.internalDate ?? 0);
        const occurredAt = internalMs ? new Date(internalMs) : new Date();

        const event: CreateRawEventDTO & { userId: string } = {
          userId,
          provider: "gmail",
          payload: msg as unknown as Record<string, unknown>,
          occurredAt,
          batchId,
          sourceMeta: {
            labelIds: msg.labelIds ?? [],
            fetchedAt: new Date().toISOString(),
            matchedQuery: query,
            syncType: "service_sync",
          },
          sourceId: msg.id ?? messageId,
        };

        createPayloads.push(event);
      } catch (error) {
        errors++;
        await logger.warn("Failed to fetch Gmail message", {
          operation: "gmail_sync_batch",
          additionalData: {
            userId,
            messageId,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      } finally {
        processed++;
      }
    }

    if (createPayloads.length === 0) {
      return { processed, inserted, errors };
    }

    // Try bulk upsert via repository (should dedupe internally)
    try {
      await RawEventsRepository.createBulkRawEvents(createPayloads);
      inserted += createPayloads.length;
      return { processed, inserted, errors };
    } catch (bulkError) {
      // Fall back to per-message create to compute accurate inserted/errors
      await logger.warn("Bulk raw_events upsert failed; falling back to per-item", {
        operation: "gmail_sync_batch",
        additionalData: {
          userId,
          batchSize: createPayloads.length,
          error: bulkError instanceof Error ? bulkError.message : String(bulkError),
        },
      });

      for (const ev of createPayloads) {
        try {
          await RawEventsRepository.createRawEvent(ev);
          inserted++;
        } catch (e) {
          errors++;
        }
      }
      return { processed, inserted, errors };
    }
  }

  private static mask(id: string) {
    return id.slice(0, 8) + "...";
  }

  /**
   * Fetch+insert helper used by test and bulk ingestion entrypoints.
   */
  private static async fetchAndInsertMessages(
    gmail: gmail_v1.Gmail,
    messageIds: (string | null | undefined)[],
    userId: string,
    batchId?: string,
    sourceMetaExtras?: Record<string, unknown>,
  ): Promise<Array<{ id: string; success: boolean; error?: string }>> {
    const validIds = messageIds.filter(Boolean) as string[];
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    const toInsert: Array<CreateRawEventDTO & { userId: string }> = [];

    for (const messageId of validIds) {
      try {
        const messageResponse = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full",
        });

        const msg = messageResponse.data as gmail_v1.Schema$Message & {
          internalDate?: string | null;
        };
        if (!msg) {
          results.push({ id: messageId, success: false, error: "no_message_data" });
          continue;
        }

        // Optional existence check (skip if present). If createBulkRawEvents handles upsert,
        // we can skip this check for performance. Uncomment if you want pre-check behavior.
        // const existing = await RawEventsRepository.findRawEventBySourceId(userId, "gmail", msg.id ?? messageId);
        // if (existing) {
        //   results.push({ id: messageId, success: true, error: "already_exists" });
        //   continue;
        // }

        const internalMs = Number(msg.internalDate ?? 0);
        const occurredAt = internalMs ? new Date(internalMs) : new Date();

        toInsert.push({
          userId,
          provider: "gmail",
          payload: msg as unknown as Record<string, unknown>,
          occurredAt,
          batchId,
          sourceMeta: {
            fetchedAt: new Date().toISOString(),
            ...sourceMetaExtras,
          },
          sourceId: msg.id ?? messageId,
        });

        results.push({ id: messageId, success: true });
      } catch (error) {
        results.push({
          id: messageId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (toInsert.length > 0) {
      try {
        await RawEventsRepository.createBulkRawEvents(toInsert);
      } catch {
        // fall back per item to ensure at least partial success
        for (const ev of toInsert) {
          try {
            await RawEventsRepository.createRawEvent(ev);
          } catch (e) {
            // mark the corresponding result as failed if needed
            const idx = results.findIndex((r) => r.id === (ev.sourceId ?? ""));
            if (idx >= 0)
              results[idx] = { id: ev.sourceId ?? "", success: false, error: String(e) };
          }
        }
      }
    }

    return results;
  }
}

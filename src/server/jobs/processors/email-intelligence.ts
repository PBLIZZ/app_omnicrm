// Email Intelligence Job Processor
// Processes raw Gmail events to extract business intelligence and insights

import { getDb } from "@/server/db/client";
import { rawEvents, aiInsights } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { log } from "@/lib/log";
import type { JobRecord } from "../types";
import {
  processEmailIntelligence,
  storeEmailIntelligence,
  type EmailIntelligence,
} from "@/server/services/email-intelligence.service";

export interface EmailIntelligenceJobPayload {
  rawEventId: string;
  batchId?: string;
  maxRetries?: number;
}

/**
 * Process email intelligence for a single raw Gmail event
 */
export async function runEmailIntelligence(
  job: JobRecord<"email_intelligence">
): Promise<void> {
  const startTime = Date.now();
  const { rawEventId } = job.payload;

  try {
    log.info(
      {
        op: "email_intelligence.start",
        userId: job.userId,
        rawEventId,
        jobId: job.id,
      },
      "Starting email intelligence processing",
    );

    // Process the email intelligence
    const intelligence = await processEmailIntelligence(job.userId, rawEventId);

    // Store the results
    await storeEmailIntelligence(job.userId, rawEventId, intelligence);

    const duration = Date.now() - startTime;
    log.info(
      {
        op: "email_intelligence.complete",
        userId: job.userId,
        rawEventId,
        category: intelligence.classification.primaryCategory,
        businessRelevance: intelligence.classification.businessRelevance,
        contactMatched: Boolean(intelligence.contactMatch.contactId),
        duration,
        jobId: job.id,
      },
      "Email intelligence processing completed",
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(
      {
        op: "email_intelligence.error",
        userId: job.userId,
        rawEventId,
        error: error instanceof Error ? error.message : String(error),
        duration,
        jobId: job.id,
      },
      "Email intelligence processing failed",
    );
    throw error;
  }
}

/**
 * Batch process multiple raw events for email intelligence
 */
export async function runEmailIntelligenceBatch(
  job: JobRecord<"email_intelligence_batch">
): Promise<void> {
  const startTime = Date.now();
  const { batchId, maxItems = 50 } = job.payload;

  try {
    log.info(
      {
        op: "email_intelligence_batch.start",
        userId: job.userId,
        batchId,
        maxItems,
        jobId: job.id,
      },
      "Starting batch email intelligence processing",
    );

    const db = await getDb();

    // Find unprocessed Gmail raw events
    const rawEventQuery = db
      .select({
        id: rawEvents.id,
        payload: rawEvents.payload,
        occurredAt: rawEvents.occurredAt,
      })
      .from(rawEvents)
      .where(
        and(
          eq(rawEvents.userId, job.userId),
          eq(rawEvents.provider, "gmail"),
          ...(batchId ? [eq(rawEvents.batchId, batchId)] : [])
        )
      )
      .limit(maxItems);

    // Filter out events that already have email intelligence insights
    const unprocessedEvents = await rawEventQuery;
    const processedEventIds = new Set();

    if (unprocessedEvents.length > 0) {
      const eventIds = unprocessedEvents.map(e => e.id);
      const existingInsights = await db
        .select({ subjectId: aiInsights.subjectId })
        .from(aiInsights)
        .where(
          and(
            eq(aiInsights.userId, job.userId),
            eq(aiInsights.kind, "email_intelligence"),
            sql`${aiInsights.subjectId} = ANY(${eventIds})`
          )
        );

      existingInsights.forEach(insight => {
        if (insight.subjectId) {
          processedEventIds.add(insight.subjectId);
        }
      });
    }

    const eventsToProcess = unprocessedEvents.filter(
      event => !processedEventIds.has(event.id)
    );

    if (eventsToProcess.length === 0) {
      log.info(
        {
          op: "email_intelligence_batch.no_events",
          userId: job.userId,
          batchId,
          totalFound: unprocessedEvents.length,
        },
        "No unprocessed email events found for intelligence extraction",
      );
      return;
    }

    let processedCount = 0;
    let errorCount = 0;
    const results: Array<{
      eventId: string;
      success: boolean;
      category?: string;
      businessRelevance?: number;
      error?: string;
    }> = [];

    // Process events sequentially to avoid rate limiting
    for (const event of eventsToProcess) {
      try {
        const intelligence = await processEmailIntelligence(job.userId, event.id);
        await storeEmailIntelligence(job.userId, event.id, intelligence);
        
        results.push({
          eventId: event.id,
          success: true,
          category: intelligence.classification.primaryCategory,
          businessRelevance: intelligence.classification.businessRelevance,
        });
        
        processedCount++;

        // Small delay to be respectful to LLM APIs
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          eventId: event.id,
          success: false,
          error: errorMessage,
        });
        
        errorCount++;
        
        log.warn(
          {
            op: "email_intelligence_batch.event_error",
            userId: job.userId,
            eventId: event.id,
            error: errorMessage,
          },
          "Failed to process individual email for intelligence",
        );

        // Continue processing other events even if one fails
        continue;
      }
    }

    const duration = Date.now() - startTime;
    log.info(
      {
        op: "email_intelligence_batch.complete",
        userId: job.userId,
        batchId,
        totalEvents: eventsToProcess.length,
        processedCount,
        errorCount,
        duration,
        jobId: job.id,
      },
      "Batch email intelligence processing completed",
    );

    // Log summary of results
    const categoryStats = results
      .filter(r => r.success && r.category)
      .reduce((acc, r) => {
        acc[r.category!] = (acc[r.category!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const avgBusinessRelevance = results
      .filter(r => r.success && r.businessRelevance !== undefined)
      .reduce((sum, r, _, arr) => sum + r.businessRelevance! / arr.length, 0);

    log.info(
      {
        op: "email_intelligence_batch.summary",
        userId: job.userId,
        categoryStats,
        avgBusinessRelevance: Math.round(avgBusinessRelevance * 100) / 100,
      },
      "Batch processing summary",
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(
      {
        op: "email_intelligence_batch.error",
        userId: job.userId,
        batchId,
        error: error instanceof Error ? error.message : String(error),
        duration,
        jobId: job.id,
      },
      "Batch email intelligence processing failed",
    );
    throw error;
  }
}

/**
 * Cleanup old email intelligence insights to prevent database bloat
 * Keeps recent insights and high-value business intelligence
 */
export async function runEmailIntelligenceCleanup(
  job: JobRecord<"email_intelligence_cleanup">
): Promise<void> {
  const startTime = Date.now();
  const { retentionDays = 90, keepHighValue = true } = job.payload;

  try {
    log.info(
      {
        op: "email_intelligence_cleanup.start",
        userId: job.userId,
        retentionDays,
        keepHighValue,
        jobId: job.id,
      },
      "Starting email intelligence cleanup",
    );

    const db = await getDb();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    let deletedCount = 0;

    if (keepHighValue) {
      // Delete only low-value insights older than retention period
      const result = await db.execute(sql`
        DELETE FROM ai_insights 
        WHERE user_id = ${job.userId}
          AND kind = 'email_intelligence'
          AND created_at < ${cutoffDate.toISOString()}
          AND (
            (content->>'classification'->>'businessRelevance')::numeric < 0.6
            AND (content->>'classification'->>'primaryCategory') NOT IN ('client_communication', 'business_intelligence')
          )
      `);
      deletedCount = result.length;
    } else {
      // Delete all insights older than retention period
      const result = await db.execute(sql`
        DELETE FROM ai_insights 
        WHERE user_id = ${job.userId}
          AND kind = 'email_intelligence'
          AND created_at < ${cutoffDate.toISOString()}
      `);
      deletedCount = result.length;
    }

    const duration = Date.now() - startTime;
    log.info(
      {
        op: "email_intelligence_cleanup.complete",
        userId: job.userId,
        deletedCount,
        retentionDays,
        duration,
        jobId: job.id,
      },
      "Email intelligence cleanup completed",
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error(
      {
        op: "email_intelligence_cleanup.error",
        userId: job.userId,
        error: error instanceof Error ? error.message : String(error),
        duration,
        jobId: job.id,
      },
      "Email intelligence cleanup failed",
    );
    throw error;
  }
}
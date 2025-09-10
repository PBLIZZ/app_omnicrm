// Admin API endpoint for email intelligence processing
// For testing and manual triggering of email intelligence jobs

import { getDb } from "@/server/db/client";
import { rawEvents, jobs } from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "@/lib/observability";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { ensureError } from "@/lib/utils/error-handler";
import {
  processEmailIntelligence,
  generateWeeklyDigest,
} from "@/server/services/email-intelligence.service";
import { enqueue } from "@/server/jobs/enqueue";
import { z } from "zod";

const PostBodySchema = z.object({
  action: z
    .enum(["process_single", "enqueue_batch", "weekly_digest", "cleanup"])
    .default("process_single"),
  rawEventId: z.string().optional(),
  batchId: z.string().optional(),
  maxItems: z.number().default(10),
  generateWeekly: z.boolean().default(false),
  retentionDays: z.number().default(90),
  keepHighValue: z.boolean().default(true),
});

const GetQuerySchema = z.object({
  limit: z.coerce.number().default(20),
  days: z.coerce.number().default(7),
});

/**
 * POST /api/admin/email-intelligence
 * Trigger email intelligence processing for raw Gmail events
 */
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "admin_email_intelligence_post" },
  validation: {
    body: PostBodySchema,
  },
})(async ({ userId, validated, requestId }) => {
  const apiResponse = new ApiResponseBuilder("admin.email_intelligence.post", requestId);

  try {
    const { action, rawEventId, batchId, maxItems, generateWeekly, retentionDays, keepHighValue } =
      validated.body;

    const db = await getDb();

    switch (action) {
      case "process_single": {
        if (!rawEventId) {
          return apiResponse.error("rawEventId required for single processing", "VALIDATION_ERROR");
        }

        // Verify the raw event exists and belongs to the user
        const [rawEvent] = await db
          .select()
          .from(rawEvents)
          .where(
            and(
              eq(rawEvents.id, rawEventId),
              eq(rawEvents.userId, userId),
              eq(rawEvents.provider, "gmail"),
            ),
          )
          .limit(1);

        if (!rawEvent) {
          return apiResponse.error("Raw event not found or not a Gmail event", "NOT_FOUND");
        }

        // Process immediately
        const intelligence = await processEmailIntelligence(userId, rawEventId);

        await logger.info("Single email intelligence processed via admin API", {
          operation: "admin.email_intelligence.single_complete",
          additionalData: {
            userId,
            rawEventId,
            category: intelligence.classification.primaryCategory,
            businessRelevance: intelligence.classification.businessRelevance,
          },
        });

        return apiResponse.success({
          success: true,
          data: {
            rawEventId: rawEventId,
            intelligence,
            processingTime: intelligence.processingMeta.processedAt,
          },
        });
      }

      case "enqueue_batch": {
        // Enqueue a batch processing job
        await enqueue(
          "email_intelligence_batch",
          {
            batchId: batchId ?? "admin_batch",
            maxItems: maxItems,
            onlyUnprocessed: true,
          },
          userId,
        );

        return apiResponse.success({
          success: true,
          data: {
            action: "email_intelligence_batch",
            batchId: batchId ?? "admin_batch",
            maxItems: maxItems,
          },
        });
      }

      case "weekly_digest": {
        if (!generateWeekly) {
          return apiResponse.error(
            "generateWeekly must be true for weekly digest",
            "VALIDATION_ERROR",
          );
        }

        // Generate weekly digest immediately
        const digest = await generateWeeklyDigest(userId);

        await logger.info("Weekly digest generated via admin API", {
          operation: "admin.email_intelligence.weekly_digest",
          additionalData: {
            userId,
            emailCount: digest.summary.totalEmails,
            businessRelevance: digest.summary.avgBusinessRelevance,
          },
        });

        return apiResponse.success({
          success: true,
          data: {
            digest,
            timeframe: digest.timeframe,
          },
        });
      }

      case "cleanup": {
        await enqueue(
          "email_intelligence_cleanup",
          {
            retentionDays: retentionDays,
            keepHighValue: keepHighValue,
          },
          userId,
        );

        return apiResponse.success({
          success: true,
          data: {
            action: "email_intelligence_cleanup",
            retentionDays: retentionDays,
            keepHighValue: keepHighValue,
          },
        });
      }

      default:
        return apiResponse.error(
          `Unknown action: ${action}. Available: process_single, enqueue_batch, weekly_digest, cleanup`,
          "VALIDATION_ERROR",
        );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process email intelligence";
    return apiResponse.error(errorMessage, "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

/**
 * GET /api/admin/email-intelligence
 * Get email intelligence statistics and recent processed emails
 */
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "admin_email_intelligence_get" },
  validation: {
    query: GetQuerySchema,
  },
})(async ({ userId, validated, requestId }) => {
  const apiResponse = new ApiResponseBuilder("admin.email_intelligence.get", requestId);

  try {
    const { limit, days: daysBack } = validated.query;

    const db = await getDb();

    // Get recent raw Gmail events
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const recentGmailEvents = await db
      .select({
        id: rawEvents.id,
        occurredAt: rawEvents.occurredAt,
        sourceMeta: rawEvents.sourceMeta,
        createdAt: rawEvents.createdAt,
      })
      .from(rawEvents)
      .where(
        and(
          eq(rawEvents.userId, userId),
          eq(rawEvents.provider, "gmail"),
          sql`${rawEvents.occurredAt} >= ${cutoffDate.toISOString()}`,
        ),
      )
      .orderBy(desc(rawEvents.occurredAt))
      .limit(limit);

    // Get email intelligence insights statistics
    const insightsStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_insights,
        COUNT(CASE WHEN (content->>'classification'->>'primaryCategory') = 'client_communication' THEN 1 END) as client_emails,
        COUNT(CASE WHEN (content->>'classification'->>'primaryCategory') = 'business_intelligence' THEN 1 END) as business_emails,
        AVG((content->>'classification'->>'businessRelevance')::numeric) as avg_business_relevance,
        COUNT(CASE WHEN (content->>'contactMatch'->>'contactId') IS NOT NULL THEN 1 END) as matched_contacts
      FROM ai_insights 
      WHERE user_id = ${userId}
        AND kind = 'email_intelligence'
        AND created_at >= ${cutoffDate.toISOString()}
    `);

    const stats = (insightsStats[0] as Record<string, unknown>) ?? {};

    // Get job status for email intelligence jobs
    const recentJobs = await db
      .select({
        id: jobs.id,
        kind: jobs.kind,
        status: jobs.status,
        attempts: jobs.attempts,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          sql`${jobs.kind} LIKE 'email_intelligence%'`,
          sql`${jobs.createdAt} >= ${cutoffDate.toISOString()}`,
        ),
      )
      .orderBy(desc(jobs.createdAt))
      .limit(10);

    return apiResponse.success({
      success: true,
      data: {
        statistics: {
          totalGmailEvents: recentGmailEvents.length,
          totalInsights: Number(stats["total_insights"] ?? 0),
          clientEmails: Number(stats["client_emails"] ?? 0),
          businessEmails: Number(stats["business_emails"] ?? 0),
          avgBusinessRelevance: Number(stats["avg_business_relevance"] ?? 0),
          matchedContacts: Number(stats["matched_contacts"] ?? 0),
          timeframe: {
            startDate: cutoffDate.toISOString(),
            endDate: new Date().toISOString(),
            daysBack,
          },
        },
        recentGmailEvents: recentGmailEvents.slice(0, 10),
        recentJobs,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get email intelligence statistics";
    return apiResponse.error(errorMessage, "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

// Admin API endpoint for email intelligence processing
// For testing and manual triggering of email intelligence jobs

import { NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { rawEvents, jobs } from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { log } from "@/lib/log";
import { getServerUserId } from "@/server/auth/user";
import { err, ok, safeJson } from "@/lib/api/http";
import {
  processEmailIntelligence,
  generateWeeklyDigest,
} from "@/server/services/email-intelligence.service";
import { enqueue } from "@/server/jobs/enqueue";

/**
 * POST /api/admin/email-intelligence
 * Trigger email intelligence processing for raw Gmail events
 */
export async function POST(request: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  try {
    const body = (await safeJson<unknown>(request)) ?? {};
    const bodyObj = body as Record<string, unknown>;
    const {
      action = "process_single",
      rawEventId,
      batchId,
      maxItems = 10,
      generateWeekly = false,
      retentionDays = 90,
      keepHighValue = true,
    } = bodyObj;

    const db = await getDb();

    switch (action) {
      case "process_single": {
        if (!rawEventId) {
          return err(400, "rawEventId required for single processing");
        }

        // Verify the raw event exists and belongs to the user
        const [rawEvent] = await db
          .select()
          .from(rawEvents)
          .where(
            and(
              eq(rawEvents.id, rawEventId as string),
              eq(rawEvents.userId, userId),
              eq(rawEvents.provider, "gmail"),
            ),
          )
          .limit(1);

        if (!rawEvent) {
          return err(404, "Raw event not found or not a Gmail event");
        }

        // Process immediately
        const intelligence = await processEmailIntelligence(userId, rawEventId as string);

        log.info(
          {
            op: "admin.email_intelligence.single_complete",
            userId,
            rawEventId,
            category: intelligence.classification.primaryCategory,
            businessRelevance: intelligence.classification.businessRelevance,
          },
          "Single email intelligence processed via admin API",
        );

        return ok({
          success: true,
          data: {
            rawEventId: rawEventId as string,
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
            batchId: batchId as string,
            maxItems: maxItems as number,
            onlyUnprocessed: true,
          },
          userId,
        );

        return ok({
          success: true,
          data: {
            action: "email_intelligence_batch",
            batchId: batchId as string,
            maxItems: maxItems as number,
          },
        });
      }

      case "weekly_digest": {
        if (!generateWeekly) {
          return err(400, "generateWeekly must be true for weekly digest");
        }

        // Generate weekly digest immediately
        const digest = await generateWeeklyDigest(userId);

        log.info(
          {
            op: "admin.email_intelligence.weekly_digest",
            userId,
            emailCount: digest.summary.totalEmails,
            businessRelevance: digest.summary.avgBusinessRelevance,
          },
          "Weekly digest generated via admin API",
        );

        return ok({
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
            retentionDays: retentionDays as number,
            keepHighValue: keepHighValue as boolean,
          },
          userId,
        );

        return ok({
          success: true,
          data: {
            action: "email_intelligence_cleanup",
            retentionDays: retentionDays as number,
            keepHighValue: keepHighValue as boolean,
          },
        });
      }

      default:
        return err(
          400,
          `Unknown action: ${action}. Available: process_single, enqueue_batch, weekly_digest, cleanup`,
        );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process email intelligence";
    return err(500, errorMessage);
  }
}

/**
 * GET /api/admin/email-intelligence
 * Get email intelligence statistics and recent processed emails
 */
export async function GET(request: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const daysBack = parseInt(searchParams.get("days") ?? "7", 10);

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

    return ok({
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
    return err(500, errorMessage);
  }
}

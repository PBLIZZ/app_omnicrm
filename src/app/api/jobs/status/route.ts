/**
 * GET /api/jobs/status — Enhanced job status with error tracking and data freshness
 *
 * Provides comprehensive status information about job processing including:
 * - Current job queue counts by status and type
 * - Processing progress and estimated completion times
 * - Recent job history and error summaries
 * - Data freshness indicators for UI components
 * - Health monitoring and stuck job detection
 */
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { and, desc, eq, sql, count, inArray } from "drizzle-orm";
import { jobs, rawEvents, interactions, contacts } from "@/server/db/schema";
import { logger } from "@/lib/observability";
import { z } from "zod";

const jobStatusQuerySchema = z.object({
  includeHistory: z.coerce.boolean().optional().default(false),
  includeFreshness: z.coerce.boolean().optional().default(true),
  batchId: z.string().optional(), // For tracking specific sync session jobs
});

interface JobStatusResponse {
  id: string;
  kind: string;
  status: "queued" | "processing" | "completed" | "failed" | "retrying";
  progress?: number | undefined;
  message?: string | undefined;
  batchId?: string | undefined;
  createdAt: string;
  updatedAt: string;
  attempts?: number;
  hasError?: boolean;
  ageMinutes?: number;
  // Legacy fields for backward compatibility
  totalEmails?: number | undefined;
  processedEmails?: number | undefined;
  newEmails?: number | undefined;
  chunkSize?: number | undefined;
  chunksTotal?: number | undefined;
  chunksProcessed?: number | undefined;
}

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "jobs_status" },
  validation: { query: jobStatusQuerySchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("jobs.status", requestId);
  const { includeHistory, includeFreshness, batchId } = validated.query;

  try {
    const db = await getDb();

    // Base condition for user's jobs
    const baseCondition = eq(jobs.userId, userId);
    const conditions = batchId
      ? [baseCondition, eq(jobs.batchId, batchId)]
      : [baseCondition];

    // Get job counts by status and kind
    const jobCounts = await db
      .select({
        status: jobs.status,
        kind: jobs.kind,
        count: count(),
      })
      .from(jobs)
      .where(and(...conditions))
      .groupBy(jobs.status, jobs.kind);

    // Aggregate counts by status
    const statusCounts = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      retrying: 0,
    };

    // Aggregate counts by job type
    const kindCounts = {
      normalize: 0,
      embed: 0,
      insight: 0,
      sync_gmail: 0,
      sync_calendar: 0,
      google_gmail_sync: 0, // Legacy support
    };

    jobCounts.forEach(({ status, kind, count: jobCount }) => {
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts] += jobCount;
      }
      if (kind in kindCounts) {
        kindCounts[kind as keyof typeof kindCounts] += jobCount;
      }
    });

    // Get pending job details (queued + processing)
    const pendingJobs = await db
      .select({
        id: jobs.id,
        kind: jobs.kind,
        status: jobs.status,
        payload: jobs.payload,
        attempts: jobs.attempts,
        batchId: jobs.batchId,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        lastError: jobs.lastError,
      })
      .from(jobs)
      .where(and(
        ...conditions,
        inArray(jobs.status, ['queued', 'processing', 'retrying'])
      ))
      .orderBy(jobs.createdAt)
      .limit(50);

    // Get recent job history
    const recentJobs = await db
      .select({
        id: jobs.id,
        kind: jobs.kind,
        status: jobs.status,
        attempts: jobs.attempts,
        batchId: jobs.batchId,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        lastError: jobs.lastError,
        payload: jobs.payload,
      })
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.updatedAt))
      .limit(includeHistory ? 50 : 20);

    // Calculate data freshness indicators if requested
    let dataFreshness = null;
    if (includeFreshness) {
      const [rawEventCount, processedInteractionCount, contactCount] = await Promise.all([
        // Count raw events that might need processing
        db
          .select({ count: count() })
          .from(rawEvents)
          .where(eq(rawEvents.userId, userId)),

        // Count processed interactions
        db
          .select({ count: count() })
          .from(interactions)
          .where(eq(interactions.userId, userId)),

        // Count contacts
        db
          .select({ count: count() })
          .from(contacts)
          .where(eq(contacts.userId, userId)),
      ]);

      const totalRawEvents = rawEventCount[0]?.count ?? 0;
      const totalInteractions = processedInteractionCount[0]?.count ?? 0;
      const totalContacts = contactCount[0]?.count ?? 0;

      // Estimate processing completion percentage
      const processingRate = totalRawEvents > 0
        ? Math.round((totalInteractions / totalRawEvents) * 100)
        : 100;

      dataFreshness = {
        totalRawEvents,
        totalInteractions,
        totalContacts,
        processingRate,
        needsProcessing: statusCounts.queued > 0 || statusCounts.processing > 0,
        pendingNormalization: kindCounts.normalize,
        pendingEmbedding: kindCounts.embed,
        pendingInsights: kindCounts.insight,
        lastProcessedAt: recentJobs.find(j => j.status === 'completed')?.updatedAt ?? null,
      };
    }

    // Calculate estimated completion time for pending jobs
    let estimatedCompletion = null;
    if (pendingJobs.length > 0) {
      // Rough estimates based on job type (in seconds per job)
      const jobDurations = {
        normalize: 2,
        embed: 5,
        insight: 10,
        sync_gmail: 30,
        sync_calendar: 20,
        google_gmail_sync: 30, // Legacy support
      };

      const totalEstimatedSeconds = pendingJobs.reduce((sum, job) => {
        const duration = jobDurations[job.kind as keyof typeof jobDurations] || 5;
        return sum + duration;
      }, 0);

      estimatedCompletion = {
        totalJobs: pendingJobs.length,
        estimatedSeconds: totalEstimatedSeconds,
        estimatedMinutes: Math.ceil(totalEstimatedSeconds / 60),
        estimatedCompletionAt: new Date(Date.now() + totalEstimatedSeconds * 1000).toISOString(),
      };
    }

    // Detect any jobs that have been processing for too long (stuck jobs)
    const stuckJobThresholdMs = 10 * 60 * 1000; // 10 minutes
    const stuckJobs = pendingJobs.filter(job => {
      if (job.status !== 'processing') return false;
      const timeSinceUpdate = Date.now() - new Date(job.updatedAt).getTime();
      return timeSinceUpdate > stuckJobThresholdMs;
    });

    // Calculate processing health score
    const healthScore = calculateProcessingHealthScore({
      statusCounts,
      stuckJobsCount: stuckJobs.length,
      totalJobs: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
      recentFailures: recentJobs.filter(j => j.status === 'failed').length,
    });

    // Map jobs to response format
    const jobStatuses: JobStatusResponse[] = recentJobs.map((job) => {
      const createdAt = job.createdAt instanceof Date ? job.createdAt.toISOString() : String(job.createdAt ?? "");
      const updatedAt = job.updatedAt instanceof Date ? job.updatedAt.toISOString() : String(job.updatedAt ?? "");

      // Legacy gmail sync job payload parsing
      let extras: Partial<JobStatusResponse> = {};
      if (job.kind === "google_gmail_sync" && job.payload && typeof job.payload === "object") {
        const p = job.payload as Record<string, unknown>;
        const total = typeof p["totalEmails"] === "number" ? p["totalEmails"] : undefined;
        const done = typeof p["processedEmails"] === "number" ? p["processedEmails"] : undefined;
        const newEmails = typeof p["newEmails"] === "number" ? p["newEmails"] : undefined;
        const chunkSize = typeof p["chunkSize"] === "number" ? p["chunkSize"] : undefined;
        const chunksTotal = typeof p["chunksTotal"] === "number" ? p["chunksTotal"] : undefined;
        const chunksProcessed = typeof p["chunksProcessed"] === "number" ? p["chunksProcessed"] : undefined;
        const progress = total && done ? Math.max(1, Math.min(99, Math.round((done / total) * 100))) : undefined;
        extras = {
          totalEmails: total,
          processedEmails: done,
          newEmails,
          chunkSize,
          chunksTotal,
          chunksProcessed,
          progress,
        };
      }

      return {
        id: job.id,
        kind: job.kind,
        status: job.status as JobStatusResponse["status"],
        batchId: job.batchId ?? undefined,
        createdAt,
        updatedAt,
        attempts: job.attempts,
        hasError: !!job.lastError,
        ageMinutes: Math.round((Date.now() - new Date(job.createdAt).getTime()) / 60000),
        message: typeof job.lastError === "string" ? job.lastError : undefined,
        ...extras,
      };
    });

    // Determine current batch (legacy support)
    const currentBatch = recentJobs.find((job) => job.status === "queued" || job.status === "processing")?.batchId ?? null;

    // Legacy email counts for backward compatibility
    let totalEmails = 0;
    let processedEmails = 0;
    if (currentBatch) {
      const eventStats = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(rawEvents)
        .where(
          and(
            eq(rawEvents.userId, userId),
            eq(rawEvents.batchId, currentBatch),
            eq(rawEvents.provider, "gmail"),
          ),
        );
      processedEmails = eventStats[0]?.count ?? 0;

      const gmailSyncJob = recentJobs.find(
        (job) => job.kind === "google_gmail_sync" && job.batchId === currentBatch,
      );
      if (gmailSyncJob?.payload && typeof gmailSyncJob.payload === "object") {
        const payload = gmailSyncJob.payload as Record<string, unknown>;
        const n = payload?.["totalEmails"];
        if (typeof n === "number") totalEmails = n;
      }
    }

    return api.success({
      // Enhanced data
      queue: {
        statusCounts,
        kindCounts,
        totalJobs: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
        pendingJobs: pendingJobs.length,
        failedJobs: statusCounts.failed,
      },
      pendingJobs: pendingJobs.map(job => ({
        id: job.id,
        kind: job.kind,
        status: job.status,
        attempts: job.attempts,
        batchId: job.batchId,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        hasError: !!job.lastError,
        ageMinutes: Math.round((Date.now() - new Date(job.createdAt).getTime()) / 60000),
      })),
      dataFreshness,
      estimatedCompletion,
      stuckJobs: stuckJobs.map(job => ({
        id: job.id,
        kind: job.kind,
        ageMinutes: Math.round((Date.now() - new Date(job.updatedAt).getTime()) / 60000),
      })),
      health: {
        score: healthScore,
        status: getHealthStatus(healthScore),
        issues: identifyHealthIssues({
          statusCounts,
          stuckJobsCount: stuckJobs.length,
          failureRate: recentJobs.length > 0
            ? (recentJobs.filter(j => j.status === 'failed').length / recentJobs.length) * 100
            : 0,
        }),
      },

      // Legacy format for backward compatibility
      jobs: jobStatuses,
      currentBatch,
      totalEmails: totalEmails > 0 ? totalEmails : undefined,
      processedEmails: processedEmails > 0 ? processedEmails : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    void logger.warn("Job status query error", {
      operation: "jobs.status.error",
      additionalData: { userId, error: msg },
    });
    // Return a safe, empty state so the UI does not break
    return api.success({
      jobs: [],
      currentBatch: null,
      queue: { statusCounts: {}, kindCounts: {}, totalJobs: 0, pendingJobs: 0, failedJobs: 0 },
      pendingJobs: [],
      health: { score: 0, status: 'critical', issues: ['Unable to fetch job status'] }
    });
  }
});

/**
 * Calculate a health score (0-100) for the job processing system
 */
function calculateProcessingHealthScore(metrics: {
  statusCounts: Record<string, number>;
  stuckJobsCount: number;
  totalJobs: number;
  recentFailures: number;
}): number {
  let score = 100;

  // Deduct points for failed jobs
  const failedCount = metrics.statusCounts["failed"] ?? 0;
  if (failedCount > 0) {
    const failureRatio = failedCount / Math.max(metrics.totalJobs, 1);
    score -= failureRatio * 40; // Up to 40 points off for failures
  }

  // Deduct points for stuck jobs
  if (metrics.stuckJobsCount > 0) {
    score -= metrics.stuckJobsCount * 20; // 20 points per stuck job
  }

  // Deduct points for high queue backlog
  const queuedCount = metrics.statusCounts["queued"] ?? 0;
  const backlogRatio = queuedCount / Math.max(metrics.totalJobs, 1);
  if (backlogRatio > 0.5) {
    score -= (backlogRatio - 0.5) * 30; // Penalty for large backlogs
  }

  // Deduct points for recent failures
  if (metrics.recentFailures > 3) {
    score -= (metrics.recentFailures - 3) * 5; // 5 points per excess failure
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get health status based on score
 */
function getHealthStatus(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}

/**
 * Identify specific health issues
 */
function identifyHealthIssues(metrics: {
  statusCounts: Record<string, number>;
  stuckJobsCount: number;
  failureRate: number;
}): string[] {
  const issues: string[] = [];

  if (metrics.stuckJobsCount > 0) {
    issues.push(`${metrics.stuckJobsCount} jobs appear to be stuck`);
  }

  const failedJobsCount = metrics.statusCounts["failed"] ?? 0;
  if (failedJobsCount > 5) {
    issues.push(`High number of failed jobs (${failedJobsCount})`);
  }

  if (metrics.failureRate > 20) {
    issues.push(`High failure rate (${Math.round(metrics.failureRate)}%)`);
  }

  const queuedJobsCount = metrics.statusCounts["queued"] ?? 0;
  if (queuedJobsCount > 50) {
    issues.push(`Large job backlog (${queuedJobsCount} queued)`);
  }

  return issues;
}

import { JobsRepository } from "@repo";
import { ContactsRepository } from "@repo";
import { InteractionsRepository } from "@repo";
import { RawEventsRepository } from "@repo";
import type {
  ComprehensiveJobStatusDTO,
  JobQueueStatusDTO,
  JobStatusResponseDTO,
  DataFreshnessDTO,
  ProcessingHealthDTO,
  JobDTO,
} from "@/server/db/business-schemas/business-schema";
import { logger } from "@/lib/observability";

interface JobStatusOptions {
  includeHistory?: boolean;
  includeFreshness?: boolean;
  batchId?: string;
}

interface HealthMetrics {
  statusCounts: Record<string, number>;
  stuckJobsCount: number;
  totalJobs: number;
  recentFailures: number;
}

export class JobStatusService {
  /**
   * Get comprehensive job status for a user
   */
  static async getComprehensiveJobStatus(
    userId: string,
    options: JobStatusOptions = {},
  ): Promise<ComprehensiveJobStatusDTO> {
    const { includeHistory = false, includeFreshness = true, batchId } = options;

    try {
      // Get job counts and queue status
      const { statusCounts, kindCounts } = await JobsRepository.getJobCounts(userId, batchId);
      const totalJobs = Object.values(statusCounts).reduce(
        (sum: number, count: number) => sum + count,
        0,
      );

      const queue: JobQueueStatusDTO = {
        statusCounts: {
          queued: statusCounts["queued"] || 0,
          processing: statusCounts["processing"] || 0,
          completed: statusCounts["completed"] || 0,
          failed: statusCounts["failed"] || 0,
          retrying: statusCounts["retrying"] || 0,
        },
        kindCounts: {
          normalize: kindCounts["normalize"] || 0,
          embed: kindCounts["embed"] || 0,
          insight: kindCounts["insight"] || 0,
          sync_gmail: kindCounts["sync_gmail"] || 0,
          sync_calendar: kindCounts["sync_calendar"] || 0,
          google_gmail_sync: kindCounts["google_gmail_sync"] || 0,
        },
        totalJobs,
        pendingJobs:
          (statusCounts["queued"] || 0) +
          (statusCounts["processing"] || 0) +
          (statusCounts["retrying"] || 0),
        failedJobs: statusCounts["failed"] || 0,
      };

      // Get pending jobs
      const pendingJobs = await JobsRepository.getPendingJobs(userId, batchId, 50);
      const pendingJobsFormatted = pendingJobs.map((job: JobDTO) => ({
        id: job.id,
        kind: job.kind,
        status: job.status,
        attempts: job.attempts,
        batchId: job.batchId,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        hasError: !!job.lastError,
        ageMinutes: Math.round((Date.now() - new Date(job.createdAt).getTime()) / 60000),
      }));

      // Get recent jobs for history
      const recentJobs = await JobsRepository.getRecentJobs(
        userId,
        batchId,
        includeHistory ? 50 : 20,
      );

      // Calculate data freshness if requested
      let dataFreshness: DataFreshnessDTO | null = null;
      if (includeFreshness) {
        dataFreshness = await this.calculateDataFreshness(userId, statusCounts, kindCounts);
      }

      // Calculate estimated completion time
      const estimatedCompletion = this.calculateEstimatedCompletion(pendingJobs);

      // Get stuck jobs
      const stuckJobs = await JobsRepository.getStuckJobs(userId, 10);
      const stuckJobsFormatted = stuckJobs.map((job) => ({
        id: job.id,
        kind: job.kind,
        ageMinutes: Math.round((Date.now() - new Date(job.updatedAt).getTime()) / 60000),
      }));

      // Calculate processing health
      const health = this.calculateProcessingHealth({
        statusCounts,
        stuckJobsCount: stuckJobs.length,
        totalJobs,
        recentFailures: recentJobs.filter((j) => j.status === "failed").length,
      });

      // Format jobs for legacy compatibility
      const jobStatuses: JobStatusResponseDTO[] = recentJobs.map((job: JobDTO) =>
        this.formatJobStatusResponse(job),
      );

      // Legacy email counts for backward compatibility
      const currentBatch =
        recentJobs.find((job: JobDTO) => job.status === "queued" || job.status === "processing")
          ?.batchId ?? null;

      let totalEmails: number | undefined;
      let processedEmails: number | undefined;

      if (currentBatch) {
        const eventStats = await RawEventsRepository.countRawEvents(userId, {
          batchId: currentBatch,
          provider: ["gmail"],
        });
        processedEmails = eventStats;

        const gmailSyncJob = recentJobs.find(
          (job: JobDTO) => job.kind === "google_gmail_sync" && job.batchId === currentBatch,
        );

        if (gmailSyncJob?.payload && typeof gmailSyncJob.payload === "object") {
          const payload = gmailSyncJob.payload as Record<string, unknown>;
          const emailCount = payload?.["totalEmails"];
          if (typeof emailCount === "number") {
            totalEmails = emailCount;
          }
        }
      }

      return {
        queue,
        pendingJobs: pendingJobsFormatted,
        dataFreshness,
        estimatedCompletion,
        stuckJobs: stuckJobsFormatted,
        health,
        // Legacy compatibility fields
        jobs: jobStatuses,
        currentBatch,
        totalEmails,
        processedEmails,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await logger.warn("Job status query error", {
        operation: "job_status_service.get_comprehensive",
        additionalData: { userId, error: msg },
      });

      // Return safe, empty state so UI doesn't break
      return this.getEmptyJobStatus();
    }
  }

  /**
   * Calculate data freshness indicators
   */
  private static async calculateDataFreshness(
    userId: string,
    statusCounts: Record<string, number>,
    kindCounts: Record<string, number>,
  ): Promise<DataFreshnessDTO> {
    const [totalRawEvents, totalInteractions, totalContacts] = await Promise.all([
      RawEventsRepository.countRawEvents(userId),
      InteractionsRepository.countInteractions(userId),
      ContactsRepository.countContacts(userId),
    ]);

    // Estimate processing completion percentage
    const processingRate =
      totalRawEvents > 0 ? Math.round((totalInteractions / totalRawEvents) * 100) : 100;

    // Get recent jobs to find last processed timestamp
    const recentJobs = await JobsRepository.getRecentJobs(userId, undefined, 10);
    const lastProcessedJob = recentJobs.find((j: JobDTO) => j.status === "completed");

    return {
      totalRawEvents,
      totalInteractions,
      totalContacts,
      processingRate: Math.min(processingRate, 100),
      needsProcessing: (statusCounts["queued"] || 0) > 0 || (statusCounts["processing"] || 0) > 0,
      pendingNormalization: kindCounts["normalize"] || 0,
      pendingEmbedding: kindCounts["embed"] || 0,
      pendingInsights: kindCounts["insight"] || 0,
      lastProcessedAt: lastProcessedJob?.updatedAt.toISOString() ?? null,
    };
  }

  /**
   * Calculate estimated completion time for pending jobs
   */
  private static calculateEstimatedCompletion(pendingJobs: JobDTO[]): {
    totalJobs: number;
    estimatedSeconds: number;
    estimatedMinutes: number;
    estimatedCompletionAt: string;
  } | null {
    if (pendingJobs.length === 0) {
      return null;
    }

    // Rough estimates based on job type (in seconds per job)
    const jobDurations: Record<string, number> = {
      normalize: 2,
      embed: 5,
      insight: 10,
      sync_gmail: 30,
      sync_calendar: 20,
      google_gmail_sync: 30, // Legacy support
    };

    const totalEstimatedSeconds = pendingJobs.reduce((sum, job) => {
      const duration = jobDurations[job.kind] || 5;
      return sum + duration;
    }, 0);

    return {
      totalJobs: pendingJobs.length,
      estimatedSeconds: totalEstimatedSeconds,
      estimatedMinutes: Math.ceil(totalEstimatedSeconds / 60),
      estimatedCompletionAt: new Date(Date.now() + totalEstimatedSeconds * 1000).toISOString(),
    };
  }

  /**
   * Calculate processing health score and status
   */
  private static calculateProcessingHealth(metrics: HealthMetrics): ProcessingHealthDTO {
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

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    return {
      score: finalScore,
      status: this.getHealthStatus(finalScore),
      issues: this.identifyHealthIssues(metrics),
    };
  }

  /**
   * Get health status based on score
   */
  private static getHealthStatus(score: number): "excellent" | "good" | "warning" | "critical" {
    if (score >= 90) return "excellent";
    if (score >= 70) return "good";
    if (score >= 50) return "warning";
    return "critical";
  }

  /**
   * Identify specific health issues
   */
  private static identifyHealthIssues(metrics: HealthMetrics): string[] {
    const issues: string[] = [];

    if (metrics.stuckJobsCount > 0) {
      issues.push(`${metrics.stuckJobsCount} jobs appear to be stuck`);
    }

    const failedJobsCount = metrics.statusCounts["failed"] ?? 0;
    if (failedJobsCount > 5) {
      issues.push(`High number of failed jobs (${failedJobsCount})`);
    }

    const failureRate =
      metrics.totalJobs > 0 ? (metrics.recentFailures / metrics.totalJobs) * 100 : 0;

    if (failureRate > 20) {
      issues.push(`High failure rate (${Math.round(failureRate)}%)`);
    }

    const queuedJobsCount = metrics.statusCounts["queued"] ?? 0;
    if (queuedJobsCount > 50) {
      issues.push(`Large job backlog (${queuedJobsCount} queued)`);
    }

    return issues;
  }

  /**
   * Format job for status response (includes legacy Gmail sync fields)
   */
  private static formatJobStatusResponse(job: JobDTO): JobStatusResponseDTO {
    const createdAt =
      job.createdAt instanceof Date ? job.createdAt.toISOString() : String(job.createdAt);
    const updatedAt =
      job.updatedAt instanceof Date ? job.updatedAt.toISOString() : String(job.updatedAt);

    // Legacy gmail sync job payload parsing
    let extras: Partial<JobStatusResponseDTO> = {};
    if (job.kind === "google_gmail_sync" && job.payload && typeof job.payload === "object") {
      const p = job.payload as Record<string, unknown>;
      const total = typeof p["totalEmails"] === "number" ? p["totalEmails"] : undefined;
      const done = typeof p["processedEmails"] === "number" ? p["processedEmails"] : undefined;
      const newEmails = typeof p["newEmails"] === "number" ? p["newEmails"] : undefined;
      const chunkSize = typeof p["chunkSize"] === "number" ? p["chunkSize"] : undefined;
      const chunksTotal = typeof p["chunksTotal"] === "number" ? p["chunksTotal"] : undefined;
      const chunksProcessed =
        typeof p["chunksProcessed"] === "number" ? p["chunksProcessed"] : undefined;
      const progress =
        total && done ? Math.max(1, Math.min(99, Math.round((done / total) * 100))) : undefined;

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
      status: job.status as JobStatusResponseDTO["status"],
      batchId: job.batchId ?? undefined,
      createdAt,
      updatedAt,
      attempts: job.attempts,
      hasError: !!job.lastError,
      ageMinutes: Math.round((Date.now() - new Date(job.createdAt).getTime()) / 60000),
      message: typeof job.lastError === "string" ? job.lastError : undefined,
      ...extras,
    };
  }

  /**
   * Get empty job status for error cases
   */
  private static getEmptyJobStatus(): ComprehensiveJobStatusDTO {
    return {
      queue: {
        statusCounts: {
          queued: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          retrying: 0,
        },
        kindCounts: {
          normalize: 0,
          embed: 0,
          insight: 0,
          sync_gmail: 0,
          sync_calendar: 0,
          google_gmail_sync: 0,
        },
        totalJobs: 0,
        pendingJobs: 0,
        failedJobs: 0,
      },
      pendingJobs: [],
      dataFreshness: null,
      estimatedCompletion: null,
      stuckJobs: [],
      health: {
        score: 0,
        status: "critical",
        issues: ["Unable to fetch job status"],
      },
      jobs: [],
      currentBatch: null,
      timestamp: new Date().toISOString(),
    };
  }
}

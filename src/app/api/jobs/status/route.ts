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
import { handleGetWithQueryAuth } from "@/lib/api";
import { JobStatusService } from "@/server/services/job-status.service";
import { JobStatusQuerySchema, ComprehensiveJobStatusDTOSchema } from "@/server/db/business-schemas";

export const GET = handleGetWithQueryAuth(JobStatusQuerySchema, ComprehensiveJobStatusDTOSchema, async (query, userId) => {
  const { includeHistory, includeFreshness, batchId } = query;

  try {
    const result = await JobStatusService.getComprehensiveJobStatus(userId, {
      includeHistory,
      includeFreshness,
      ...(batchId !== undefined && { batchId }),
    });

    return result;
  } catch (error) {
    // Return safe, empty state so UI doesn't break
    const emptyState = {
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
        status: "critical" as const,
        issues: ["Unable to fetch job status"],
      },
      jobs: [],
      currentBatch: null,
      timestamp: new Date().toISOString(),
    };

    return emptyState;
  }
});

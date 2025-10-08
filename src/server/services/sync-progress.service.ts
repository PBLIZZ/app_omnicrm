/**
 * SyncProgressService - Manages sync session progress tracking
 *
 * This service provides real-time progress tracking for manual sync operations,
 * enabling blocking UI with live updates and comprehensive error handling.
 */

import { JobProcessingService } from "@/server/services/job-processing.service";

const SYNC_JOB_KINDS = [
  "google_gmail_sync",
  "google_calendar_sync",
  "normalize_google_email",
  "normalize_google_event",
] as const;

type SyncJobKind = (typeof SYNC_JOB_KINDS)[number];

function isSyncJobKind(kind: string): kind is SyncJobKind {
  return SYNC_JOB_KINDS.includes(kind as SyncJobKind);
}

type SyncStatus = "idle" | "queued" | "processing";

export type SyncSummary = {
  status: SyncStatus;
  lastSyncAt: string | null;
  pendingJobs: number;
  retryingJobs: number;
  failedJobs: number;
};

export class SyncProgressService {
  /**
   * Derive a lightweight sync summary from the background job queue.
   * Suitable for dashboards that only need headline state.
   */
  static async getSyncSummary(userId: string): Promise<SyncSummary> {
    const jobSummary = await JobProcessingService.getJobSummary(userId);
    const recentJobs = await JobProcessingService.listRecentJobs(userId, { limit: 25 });

    const lastSyncJob = recentJobs.find((job) => isSyncJobKind(job.kind));
    const lastSyncAt =
      lastSyncJob?.updatedAt?.toISOString() ?? lastSyncJob?.createdAt?.toISOString() ?? null;

    const status: SyncStatus =
      jobSummary.processing > 0
        ? "processing"
        : jobSummary.pending + jobSummary.retrying > 0
          ? "queued"
          : "idle";

    return {
      status,
      lastSyncAt,
      pendingJobs: jobSummary.pending,
      retryingJobs: jobSummary.retrying,
      failedJobs: jobSummary.failed,
    };
  }
}

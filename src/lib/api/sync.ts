/**
 * Sync API functions using centralized fetchJson helper
 */

import { fetchGet, fetchPost } from "@/lib/api";

export interface SyncStatus {
  googleConnected: boolean;
  flags?: {
    gmail: boolean;
    calendar: boolean;
  };
  lastSync?: {
    gmail: string | null;
    calendar: string | null;
  };
  jobs?: {
    queued: number;
    done: number;
    error: number;
  };
  lastBatchId?: string;
}

export interface SyncPreferences {
  gmailQuery?: string;
  gmailLabelIncludes?: string[];
  gmailLabelExcludes?: string[];
  calendarIncludeOrganizerSelf?: string;
  calendarIncludePrivate?: string;
  calendarTimeWindowDays?: number;
}

export interface PreviewGmailResponse {
  countByLabel: Record<string, number>;
  sampleSubjects: string[];
}

export interface PreviewCalendarResponse {
  count: number;
  sampleTitles: string[];
}

export interface ApprovalResponse {
  batchId: string;
}

export interface JobsRunResponse {
  processed: number;
}

export interface UndoResponse {
  success: boolean;
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  return fetchGet<SyncStatus>("/api/settings/sync/status");
}

/**
 * Get sync preferences
 */
export async function getSyncPreferences(): Promise<SyncPreferences> {
  return fetchGet<SyncPreferences>("/api/settings/sync/prefs");
}

/**
 * Update sync preferences
 */
export async function updateSyncPreferences(prefs: SyncPreferences): Promise<SyncPreferences> {
  return fetchPost<SyncPreferences>("/api/settings/sync/prefs", prefs, {
    errorToastTitle: "Failed to save preferences",
  });
}

/**
 * Preview Gmail sync
 */
export async function previewGmailSync(): Promise<PreviewGmailResponse> {
  return fetchPost<PreviewGmailResponse>(
    "/api/sync/preview/gmail",
    {},
    {
      errorToastTitle: "Gmail preview failed",
    },
  );
}

/**
 * Preview Calendar sync
 */
export async function previewCalendarSync(): Promise<PreviewCalendarResponse> {
  return fetchPost<PreviewCalendarResponse>(
    "/api/sync/preview/calendar",
    {},
    {
      errorToastTitle: "Calendar preview failed",
    },
  );
}

/**
 * Approve Gmail sync
 */
export async function approveGmailSync(): Promise<ApprovalResponse> {
  return fetchPost<ApprovalResponse>(
    "/api/sync/approve/gmail",
    {},
    {
      errorToastTitle: "Gmail sync approval failed",
    },
  );
}

/**
 * Approve Calendar sync
 */
export async function approveCalendarSync(): Promise<ApprovalResponse> {
  return fetchPost<ApprovalResponse>(
    "/api/sync/approve/calendar",
    {},
    {
      errorToastTitle: "Calendar sync approval failed",
    },
  );
}

/**
 * Run background jobs
 */
export async function runJobs(): Promise<JobsRunResponse> {
  return fetchPost<JobsRunResponse>(
    "/api/jobs/runner",
    {},
    {
      errorToastTitle: "Job execution failed",
    },
  );
}

/**
 * Undo sync by batch ID
 */
export async function undoSync(batchId: string): Promise<UndoResponse> {
  return fetchPost<UndoResponse>(
    "/api/sync/undo",
    { batchId },
    {
      errorToastTitle: "Undo failed",
    },
  );
}

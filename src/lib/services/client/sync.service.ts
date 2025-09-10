/**
 * Sync API functions using centralized API client
 */

import { apiClient } from "@/lib/api/client";

export interface SyncStatus {
  googleConnected: boolean;
  serviceTokens?: {
    google?: boolean;
    gmail: boolean;
    calendar: boolean;
    unified?: boolean;
  };
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
  embedJobs?: {
    queued: number;
    done: number;
    error: number;
  };
  lastBatchId?: string;
  grantedScopes?: {
    gmail: string[] | null;
    calendar: string[] | null;
  };
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
  sampleSubjects: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
  }>;
  // Optional richer preview fields
  sampleEmails?: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    hasAttachments: boolean;
    labels: string[];
  }>;
  dateRange?: {
    from: string;
    to: string;
  };
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

export interface GmailLabel {
  id: string;
  name: string;
  type: "user" | "system";
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

export interface GmailLabelsResponse {
  labels: GmailLabel[];
  totalLabels: number;
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  return apiClient.get<SyncStatus>("/api/settings/sync/status");
}

/**
 * Get sync preferences
 */
export async function getSyncPreferences(): Promise<SyncPreferences> {
  return apiClient.get<SyncPreferences>("/api/settings/sync/prefs");
}

/**
 * Update sync preferences
 */
export async function updateSyncPreferences(prefs: SyncPreferences): Promise<SyncPreferences> {
  return apiClient.post<SyncPreferences>("/api/settings/sync/prefs", prefs, {
    errorToastTitle: "Failed to save preferences",
  });
}

/**
 * Preview Gmail sync
 */
export async function previewGmailSync(): Promise<PreviewGmailResponse> {
  return apiClient.post<PreviewGmailResponse>(
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
  return apiClient.post<PreviewCalendarResponse>(
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
  return apiClient.post<ApprovalResponse>(
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
  return apiClient.post<ApprovalResponse>(
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
  return apiClient.post<JobsRunResponse>(
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
  return apiClient.post<UndoResponse>(
    "/api/sync/undo",
    { batchId },
    {
      errorToastTitle: "Undo failed",
    },
  );
}

/**
 * Fetch Gmail labels for the authenticated user
 */
export async function fetchGmailLabels(): Promise<GmailLabelsResponse> {
  return apiClient.get<GmailLabelsResponse>("/api/google/gmail/labels");
}

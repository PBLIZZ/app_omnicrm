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
  return apiClient.get<SyncStatus>("/api/google/status");
}

/**
 * Get sync preferences
 */
export async function getSyncPreferences(): Promise<SyncPreferences> {
  return apiClient.get<SyncPreferences>("/api/google/prefs");
}

/**
 * Update sync preferences
 */
export async function updateSyncPreferences(prefs: SyncPreferences): Promise<SyncPreferences> {
  return apiClient.put<SyncPreferences>("/api/google/prefs", prefs);
}

/**
 * Gmail sync - Direct sync using new consolidated endpoint
 */
export async function syncGmail(): Promise<{
  message: string;
  stats: {
    totalFound: number;
    processed: number;
    inserted: number;
    errors: number;
    batchId: string;
  };
}> {
  return apiClient.post(
    "/api/google/gmail/sync",
    {},
    {
      errorToastTitle: "Gmail sync failed",
    },
  );
}

/**
 * Calendar sync - Direct sync using new consolidated endpoint
 */
export async function syncCalendar(): Promise<{
  message: string;
  stats: {
    syncedEvents: number;
    daysPast: number;
    daysFuture: number;
    maxResults: number;
    batchId: string;
  };
}> {
  return apiClient.post(
    "/api/google/calendar/sync",
    {},
    {
      errorToastTitle: "Calendar sync failed",
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

/**
 * Sync API functions using centralized API client
 */

import { apiClient } from "@/lib/api/client";
import { GoogleStatusResponseSchema } from "@/server/db/business-schemas/google-prefs";
import type { z } from "zod";

type GoogleStatusResponse = z.infer<typeof GoogleStatusResponseSchema>;

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
export async function getSyncStatus(): Promise<GoogleStatusResponse> {
  return apiClient.get<GoogleStatusResponse>("/api/google/status?includeJobDetails=false&includeFreshness=true");
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

export interface GmailSyncResponse {
  message: string;
  stats: {
    totalFound: number;
    processed: number;
    inserted: number;
    errors: number;
    batchId: string;
  };
}

/**
 * Gmail sync - Direct sync using new consolidated endpoint
 */
export async function syncGmail(): Promise<GmailSyncResponse> {
  return apiClient.post(
    "/api/google/gmail/sync",
    {},
    {
      errorToastTitle: "Gmail sync failed",
    },
  );
}

export interface CalendarSyncResponse {
  message: string;
  stats: {
    syncedEvents: number;
    daysPast: number;
    daysFuture: number;
    maxResults: number;
    batchId: string;
  };
}

/**
 * Calendar sync - Direct sync using new consolidated endpoint
 */
export async function syncCalendar(): Promise<CalendarSyncResponse> {
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

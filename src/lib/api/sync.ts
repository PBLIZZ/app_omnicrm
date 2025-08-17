// Sync API utility functions

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

export async function getSyncStatus(): Promise<SyncStatus> {
  const response = await fetch("/api/settings/sync/status");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export async function getSyncPreferences(): Promise<SyncPreferences> {
  const response = await fetch("/api/settings/sync/prefs");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export async function updateSyncPreferences(prefs: SyncPreferences): Promise<void> {
  const response = await fetch("/api/settings/sync/prefs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

export async function previewGmailSync(): Promise<PreviewGmailResponse> {
  const response = await fetch("/api/sync/preview/gmail", { method: "POST" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.data;
}

export async function previewCalendarSync(): Promise<PreviewCalendarResponse> {
  const response = await fetch("/api/sync/preview/calendar", { method: "POST" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.data;
}

export async function approveGmailSync(): Promise<{ batchId: string }> {
  const response = await fetch("/api/sync/approve/gmail", { method: "POST" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.data;
}

export async function approveCalendarSync(): Promise<{ batchId: string }> {
  const response = await fetch("/api/sync/approve/calendar", { method: "POST" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.data;
}

export async function runJobs(): Promise<{ processed: number }> {
  const response = await fetch("/api/jobs/runner", { method: "POST" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.data;
}

export async function undoSync(batchId: string): Promise<void> {
  const response = await fetch("/api/sync/undo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchId }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

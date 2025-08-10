// Job kinds
export type GenericJobKind = "normalize" | "embed" | "insight";
export type GoogleJobKind =
  | "google_gmail_sync"
  | "google_calendar_sync"
  | "normalize_google_email"
  | "normalize_google_event";

export type JobKind = GenericJobKind | GoogleJobKind;

// Payloads
export interface BatchJobPayload {
  batchId?: string;
}

export type JobPayloadByKind = {
  normalize: Record<string, never>;
  embed: Record<string, never>;
  insight: Record<string, never>;
  google_gmail_sync: BatchJobPayload;
  google_calendar_sync: BatchJobPayload;
  normalize_google_email: BatchJobPayload;
  normalize_google_event: BatchJobPayload;
};

// Job database record structure (from schema)
export interface JobRecord {
  id: string;
  userId: string;
  kind: JobKind;
  payload: unknown;
  status: "queued" | "processing" | "done" | "error";
  attempts: number;
  batchId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Job handler function type - flexible to accommodate different job processor signatures
export type JobHandler = (job: unknown, userId: string, ...args: unknown[]) => Promise<void>;

// Error types for better error handling
export interface JobError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
}

// API Error utility function
export function toApiError(error: unknown): { status: number; message: string } {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    const status = typeof err["status"] === "number" ? err["status"] : 401;
    const message = typeof err["message"] === "string" ? err["message"] : "Unauthorized";
    return { status, message };
  }
  return { status: 401, message: "Unauthorized" };
}

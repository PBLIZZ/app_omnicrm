// server/jobs/types.ts
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

type Empty = Record<string, never>;
export type JobPayloadByKind = {
  normalize: Empty;
  embed: Empty;
  insight: Empty;
  google_gmail_sync: BatchJobPayload;
  google_calendar_sync: BatchJobPayload;
  normalize_google_email: BatchJobPayload;
  normalize_google_event: BatchJobPayload;
};

// Database record shape (matches your schema, but we type payload by kind)
export interface JobRecordBase {
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

export type JobRecord<K extends JobKind = JobKind> = Omit<JobRecordBase, "kind" | "payload"> & {
  kind: K;
  payload: JobPayloadByKind[K];
};

// Prefer handlers that know their kind
export type JobHandler<K extends JobKind = JobKind> = (job: JobRecord<K>) => Promise<void>;

// Runtime type guard if you receive a generic row
export function isJobKind<K extends JobKind>(row: JobRecordBase, kind: K): row is JobRecord<K> {
  return row.kind === kind;
}

// Error types for better error handling
export interface JobError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
}

// API Error utility function
export function toApiError(error: unknown): { status: number; message: string } {
  const fallback = { status: 401, message: "Unauthorized" };

  if (error instanceof Error) {
    const obj = error as unknown as Record<string, unknown>;
    const status = typeof obj["status"] === "number" ? obj["status"] : fallback.status;
    const message =
      typeof obj["message"] === "string" ? obj["message"] : error.message || fallback.message;
    return { status, message };
  }

  if (error && typeof error === "object") {
    const obj = error as unknown as Record<string, unknown>;
    const status = typeof obj["status"] === "number" ? obj["status"] : fallback.status;
    const message = typeof obj["message"] === "string" ? obj["message"] : fallback.message;
    return { status, message };
  }

  return fallback;
}

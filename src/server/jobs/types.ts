// server/jobs/types.ts
// Job kinds
export type GenericJobKind = "normalize" | "embed" | "insight" | "extract_contacts";
export type GoogleJobKind =
  | "google_gmail_sync"
  | "google_calendar_sync"
  | "normalize_google_email"
  | "normalize_google_event";
export type EmailIntelligenceJobKind = 
  | "email_intelligence" 
  | "email_intelligence_batch" 
  | "email_intelligence_cleanup";

export type JobKind = GenericJobKind | GoogleJobKind | EmailIntelligenceJobKind;

// Payloads
export interface BatchJobPayload {
  batchId?: string;
  daysPast?: number;
  daysFuture?: number;
  maxResults?: number;
}

export interface ContactExtractionPayload {
  mode?: "single" | "batch";
  interactionId?: string;
  maxItems?: number;
  batchId?: string;
}

export interface EmbedJobPayload {
  ownerType?: "interaction" | "document" | "contact";
  ownerId?: string;
  batchId?: string;
  maxItems?: number;
}

export interface InsightJobPayload {
  subjectType?: "contact" | "segment" | "inbox" | "workspace";
  subjectId?: string;
  kind?: "summary" | "next_step" | "risk" | "persona" | "thread_summary" | "next_best_action" | "weekly_digest" | "lead_score" | "duplicate_contact_suspected";
  batchId?: string;
  context?: Record<string, unknown>;
  interactionIds?: string[];
}

export interface EmailIntelligenceJobPayload {
  rawEventId: string;
  batchId?: string;
  maxRetries?: number;
}

export interface EmailIntelligenceBatchJobPayload {
  batchId?: string;
  maxItems?: number;
  onlyUnprocessed?: boolean;
}

export interface EmailIntelligenceCleanupJobPayload {
  retentionDays?: number;
  keepHighValue?: boolean;
}

type Empty = Record<string, never>;
export type JobPayloadByKind = {
  normalize: Empty;
  embed: EmbedJobPayload;
  insight: InsightJobPayload;
  extract_contacts: ContactExtractionPayload;
  google_gmail_sync: BatchJobPayload;
  google_calendar_sync: BatchJobPayload;
  normalize_google_email: BatchJobPayload;
  normalize_google_event: BatchJobPayload;
  email_intelligence: EmailIntelligenceJobPayload;
  email_intelligence_batch: EmailIntelligenceBatchJobPayload;
  email_intelligence_cleanup: EmailIntelligenceCleanupJobPayload;
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

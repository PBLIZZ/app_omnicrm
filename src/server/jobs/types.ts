// server/jobs/types.ts
// Job kinds

import type { Job } from "@/server/db/schema";

// Base job record from database
export type JobRecordBase = Job;

// Job kind categories
export type GenericJobKind = "embed" | "insight" | "extract_contacts";
export type GoogleJobKind = "google_gmail_sync" | "google_calendar_sync" | "normalize_google_email" | "normalize_google_event";

export type JobKind = GenericJobKind | GoogleJobKind;

// Payloads

export interface BatchJobPayload {
  batchId?: string;
  provider?: string;
}

export interface EmbedJobPayload {
  ownerId: string;
  ownerType: string;
  text: string;
  meta?: Record<string, unknown>;
}

export interface InsightJobPayload {
  subjectId: string;
  subjectType: string;
  kind: string;
  context?: Record<string, unknown>;
}

export interface ContactExtractionPayload {
  mode?: "single" | "batch";
  interactionId?: string;
  maxItems?: number;
  batchId?: string;
}


export type JobPayloadByKind = {
  embed: EmbedJobPayload;
  insight: InsightJobPayload;
  extract_contacts: ContactExtractionPayload;
  google_gmail_sync: BatchJobPayload;
  google_calendar_sync: BatchJobPayload;
  normalize_google_email: BatchJobPayload;
  normalize_google_event: BatchJobPayload;
};

// Database record shape (matches your schema, but we type payload by kind)

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

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

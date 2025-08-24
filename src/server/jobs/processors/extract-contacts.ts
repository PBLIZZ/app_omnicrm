import { log } from "@/server/log";
import type { JobRecord, ContactExtractionPayload } from "../types";

function isContactExtractionPayload(payload: unknown): payload is ContactExtractionPayload {
  return typeof payload === "object" && payload !== null;
}

/**
 * Stub processor for contact extraction jobs.
 * Currently a no-op that validates payload shape and logs lifecycle events.
 * Safe to run in production; replace with real extraction when ready.
 */
export async function runExtractContacts(job: JobRecord<"extract_contacts">): Promise<void> {
  const startedAt = Date.now();
  const payload = isContactExtractionPayload(job.payload) ? job.payload : {};

  log.info(
    {
      op: "extract_contacts.start",
      jobId: job.id,
      userId: job.userId,
      mode: payload.mode ?? "batch",
      interactionId: payload.interactionId ?? null,
      maxItems: payload.maxItems ?? null,
      batchId: payload.batchId ?? job.batchId ?? null,
    },
    "Starting extract_contacts job (stub)",
  );

  // Intentionally no-op for now. Real implementation will:
  // - read interactions (single/batch)
  // - extract contacts using rules/LLM
  // - upsert contacts and relationships
  // - emit metrics

  const durationMs = Date.now() - startedAt;
  log.info(
    {
      op: "extract_contacts.complete",
      jobId: job.id,
      userId: job.userId,
      durationMs,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
    },
    "Completed extract_contacts job (stub)",
  );
}

import type { JobRecord, JobKind, JobHandler } from "./types";
import { log } from "@/lib/log";

// Import all job processors
import { runCalendarSync, runGmailSync } from "./processors/sync";
import { runNormalizeGoogleEmail, runNormalizeGoogleEvent } from "./processors/normalize";
import { runEmbed } from "./processors/embed";
import { runInsight } from "./processors/insight";
import { runExtractContacts } from "./processors/extract-contacts";

/**
 * JobDispatcher handles routing jobs to their appropriate processors.
 *
 * Design principles:
 * - Separation of concerns: Each processor handles its own business logic
 * - Extensible: Easy to add new job types without modifying core logic
 * - Type-safe: Uses TypeScript generics to ensure payload type safety
 * - Provider-agnostic: LLM and external service calls are handled by processors
 */
export class JobDispatcher {
  private static readonly handlers = {
    // Sync processors - wrap to match JobHandler signature
    google_calendar_sync: (job: JobRecord) => runCalendarSync(job, job.userId),
    google_gmail_sync: (job: JobRecord) => runGmailSync(job, job.userId),

    // Normalization processors
    normalize: runNormalizeGoogleEvent, // Default normalize handler
    normalize_google_email: runNormalizeGoogleEmail,
    normalize_google_event: runNormalizeGoogleEvent,

    // AI/ML processors (LLM calls handled within processors)
    embed: runEmbed,
    insight: runInsight,

    // Contact processors (manual/scheduled only)
    extract_contacts: (job: JobRecord) => runExtractContacts(job as JobRecord<"extract_contacts">),
  } as Record<JobKind, (job: JobRecord) => Promise<void>>;

  /**
   * Dispatch a job to its appropriate processor
   */
  static async dispatch(job: JobRecord): Promise<void> {
    const handler = this.handlers[job.kind];

    if (!handler) {
      throw new Error(`No handler registered for job kind: ${job.kind}`);
    }

    log.info(
      {
        op: "job_dispatcher.dispatch",
        jobId: job.id,
        jobKind: job.kind,
        userId: job.userId,
        attempts: job.attempts,
      },
      `Dispatching job ${job.kind}`,
    );

    try {
      await handler(job);

      log.info(
        {
          op: "job_dispatcher.dispatch_success",
          jobId: job.id,
          jobKind: job.kind,
          userId: job.userId,
        },
        `Successfully processed job ${job.kind}`,
      );
    } catch (error) {
      log.error(
        {
          op: "job_dispatcher.dispatch_error",
          jobId: job.id,
          jobKind: job.kind,
          userId: job.userId,
          error: error instanceof Error ? error.message : String(error),
        },
        `Failed to process job ${job.kind}`,
      );
      throw error;
    }
  }

  /**
   * Register a new job handler (for extensibility)
   */
  static registerHandler<K extends JobKind>(kind: K, handler: JobHandler<K>): void {
    this.handlers[kind] = handler as JobHandler;
    log.info(
      {
        op: "job_dispatcher.register_handler",
        jobKind: kind,
      },
      `Registered handler for job kind: ${kind}`,
    );
  }

  /**
   * Get all registered job kinds
   */
  static getRegisteredKinds(): JobKind[] {
    return Object.keys(this.handlers) as JobKind[];
  }

  /**
   * Check if a job kind has a registered handler
   */
  static hasHandler(kind: JobKind): boolean {
    return kind in this.handlers;
  }
}

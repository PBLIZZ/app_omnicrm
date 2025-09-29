import { handleCron } from "@/lib/api-edge-cases";
import { JobRunner } from "@/server/jobs/runner";
import { logger } from "@/lib/observability/unified-logger";
import { ErrorHandler } from "@/lib/errors/app-error";
import { CronJobInputSchema, CronJobResultSchema } from "@/server/db/business-schemas";

/**
 * POST /api/cron/process-jobs — Cron job endpoint for processing pending jobs
 *
 * This is the API endpoint that our Supabase cron job will call.
 * It is responsible for processing any pending jobs in the queue.
 *
 * Authentication: Uses CRON_SECRET header validation (handled by handleCron)
 * Migrated to new pattern: ✅ handleCron with proper schema validation
 */
export const POST = handleCron(CronJobInputSchema, CronJobResultSchema, async () => {
  // Authentication is handled by handleCron - no need to check CRON_SECRET here
  // Note: data and request parameters not needed for this endpoint

  try {
    await logger.info("CRON - Job processor starting...", { operation: "cron_job_start" });
    const runner = new JobRunner();

    // Process pending jobs using the new cron-based approach
    const result = await runner.processPendingJobs();

    await logger.info(
      `CRON - Job processor finished. Processed: ${result.processed}, Failed: ${result.failed}`,
      {
        operation: "cron_job_complete",
        additionalData: {
          processed: result.processed,
          failed: result.failed,
        },
      },
    );

    return {
      success: true,
      message: "Job processor ran successfully.",
      processed: result.processed,
      failed: result.failed,
    };
  } catch (error) {
    await logger.error(
      "Critical error in cron job runner",
      {
        operation: "cron.process_jobs.error",
        additionalData: {},
      },
      ErrorHandler.fromError(error),
    );

    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      processed: 0,
      failed: 0,
      error: "Job processor failed",
    };
  }
});

import { ok, err } from "@/lib/api/http";
import { getServerUserId } from "@/server/auth/user";
import { JobRunner } from "@/server/jobs/runner";
import { toApiError } from "@/server/jobs/types";
import { logger } from "@/lib/observability/unified-logger";

/**
 * Manual job processing endpoint for testing and manual triggers
 * POST /api/jobs/process
 */
export async function POST(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, "unauthorized", { message });
  }

  try {
    logger.progress("Processing jobs...", "Manual job processing started");
    logger.info("Manual job processing triggered by user", {
      operation: "manual_job_processing",
      userId,
    });

    const runner = new JobRunner();

    // Process jobs (can be user-specific or all jobs)
    const result = await runner.processPendingJobs(50); // Process up to 50 jobs

    logger.success(
      "Jobs processed successfully",
      `Processed: ${result.processed}, Succeeded: ${result.succeeded}, Failed: ${result.failed}`,
      {
        description: `Successfully processed ${result.processed} jobs`,
      },
    );

    return ok({
      success: true,
      message: "Jobs processed successfully",
      ...result,
    });
  } catch (error) {
    console.error("Manual job processing failed:", error);
    return err(500, "processing_failed", {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

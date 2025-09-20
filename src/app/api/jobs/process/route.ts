import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { apiError } from "@/server/api/response";
import { JobRunner } from "@/server/jobs/runner";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * Manual job processing endpoint for testing and manual triggers
 * POST /api/jobs/process
 */
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "manual_job_processing" },
})(async ({ userId, requestId }) => {

  try {
    logger.progress("Processing jobs...", "Manual job processing started");
    await logger.info("Manual job processing triggered by user", {
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

    return NextResponse.json({
      success: true,
      message: "Jobs processed successfully",
      ...result,
    });
  } catch (error) {
    return apiError(
      "Manual job processing failed",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

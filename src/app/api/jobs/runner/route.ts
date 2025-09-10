import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { logger } from "@/lib/observability";
import { JobRunner } from "@/server/jobs/runner";
import { ensureError } from "@/lib/utils/error-handler";

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "job_runner" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("job_runner", requestId);

  try {
    // Use the new JobRunner to process queued jobs
    const jobRunner = new JobRunner();

    // Process jobs for the authenticated user
    const result = await jobRunner.processUserJobs(userId);

    await logger.info("Job runner processing completed", {
      operation: "job_runner.complete",
      additionalData: {
        userId,
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        errorCount: result.errors.length,
      },
    });

    return api.success({
      message: `Processed ${result.processed} jobs: ${result.succeeded} succeeded, ${result.failed} failed`,
      runner: "job_runner",
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logger.error(
      "Simple job processing failed",
      {
        operation: "job_runner.simple_failed",
        additionalData: {
          userId,
        },
      },
      error instanceof Error ? error : new Error(errorMessage),
    );

    // SECURITY: Don't expose internal error details to client
    return api.error(
      "Job processing failed due to internal error",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

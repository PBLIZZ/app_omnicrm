import { NextRequest } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { JobRunner } from "@/server/jobs/runner";
import { logger } from "@/lib/observability/unified-logger";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * This is the API endpoint that our Supabase cron job will call.
 * It is responsible for processing any pending jobs in the queue.
 */
export const POST = createRouteHandler({
  auth: false, // No user auth - uses cron secret instead
  rateLimit: { operation: "cron_job_processor" },
})(async ({ requestId }, request: NextRequest) => {
  const api = new ApiResponseBuilder("cron_job_processor", requestId);

  // 1. --- Secure the Endpoint ---
  // This is critical. We only want to allow requests from our own cron job.
  const authToken = (request.headers.get("authorization") ?? "").split("Bearer ").at(1);

  if (authToken !== process.env["CRON_SECRET"]) {
    await logger.security("Unauthorized cron access attempt", {
      operation: "cron.process_jobs.unauthorized",
      additionalData: {
        hasAuthToken: Boolean(authToken),
        requestId,
      },
    });
    return api.error("Unauthorized access attempt", "UNAUTHORIZED");
  }

  // 2. --- Run the Job Processor ---
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

    return api.success({
      success: true,
      message: "Job processor ran successfully.",
      ...result,
    });
  } catch (error) {
    await logger.error(
      "Critical error in cron job runner",
      {
        operation: "cron.process_jobs.error",
        additionalData: {
          requestId,
        },
      },
      ensureError(error),
    );
    return api.error(
      "Job processor failed",
      "INTERNAL_ERROR",
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      ensureError(error),
    );
  }
});

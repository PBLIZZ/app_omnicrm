import { NextRequest, NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
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
})(async ({}, request: NextRequest) => {
  // 1. --- Secure the Endpoint ---
  // This is critical. We only want to allow requests from our own cron job.
  const authToken = (request.headers.get("authorization") ?? "").split("Bearer ").at(1);

  if (authToken !== process.env["CRON_SECRET"]) {
    await logger.security("Unauthorized cron access attempt", {
      operation: "cron.process_jobs.unauthorized",
      additionalData: {
        hasAuthToken: Boolean(authToken),
      },
    });
    return NextResponse.json({ error: "Unauthorized access attempt" }, { status: 401 });
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

    return NextResponse.json({
      success: true,
      message: "Job processor ran successfully.",
      ...result,
    });
  } catch (error) {
    await logger.error(
      "Critical error in cron job runner",
      {
        operation: "cron.process_jobs.error",
        additionalData: {},
      },
      ensureError(error),
    );
    return NextResponse.json(
      {
        error: "Job processor failed",
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});

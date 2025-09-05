import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/http";
import { JobRunner } from "@/server/jobs/runner";
import { logger } from "@/lib/observability/unified-logger";

/**
 * This is the API endpoint that our Supabase cron job will call.
 * It is responsible for processing any pending jobs in the queue.
 */
export async function POST(req: NextRequest): Promise<Response> {
  // 1. --- Secure the Endpoint ---
  // This is critical. We only want to allow requests from our own cron job.
  const authToken = (req.headers.get("authorization") ?? "").split("Bearer ").at(1);

  if (authToken !== process.env["CRON_SECRET"]) {
    console.warn("CRON - Unauthorized access attempt");
    return err(401, "unauthorized");
  }

  // 2. --- Run the Job Processor ---
  try {
    logger.info("CRON - Job processor starting...", { operation: "cron_job_start" });
    const runner = new JobRunner();

    // Process pending jobs using the new cron-based approach
    const result = await runner.processPendingJobs();

    logger.info(
      `CRON - Job processor finished. Processed: ${result.processed}, Failed: ${result.failed}`,
      {
        operation: "cron_job_complete",
        processed: result.processed,
        failed: result.failed,
      },
    );

    return ok({
      success: true,
      message: "Job processor ran successfully.",
      ...result,
    });
  } catch (error) {
    console.error("CRON - A critical error occurred in the job runner:", error);
    return err(500, "runner_exception", {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

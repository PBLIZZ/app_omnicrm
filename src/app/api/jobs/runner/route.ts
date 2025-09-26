import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { JobProcessingService } from "@/server/services/job-processing.service";

/**
 * POST /api/jobs/runner - Process user-specific jobs
 */
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "job_runner_processing" },
})(async ({ userId, requestId }) => {
  try {
    const result = await JobProcessingService.processUserSpecificJobs(userId, requestId);

    return NextResponse.json({
      ok: true,
      data: {
        message: `Processed ${result.processed} jobs: ${result.succeeded} succeeded, ${result.failed} failed`,
        runner: "job_runner",
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Job processing failed due to internal error",
        details: "The job runner encountered an unexpected error. Please try again or contact support.",
      },
      { status: 500 },
    );
  }
});

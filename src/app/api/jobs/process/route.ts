import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { JobProcessingService } from "@/server/services/job-processing.service";

/**
 * Manual job processing endpoint for testing and manual triggers
 * POST /api/jobs/process
 */
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "manual_job_processing" },
})(async () => {
  try {
    const result = await JobProcessingService.processAllPendingJobs(50);

    return NextResponse.json({
      ok: true,
      data: {
        message: "Jobs processed successfully",
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Manual job processing failed",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
});

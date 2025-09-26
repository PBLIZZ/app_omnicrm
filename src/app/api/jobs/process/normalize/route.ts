import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { JobProcessingService } from "@/server/services/job-processing.service";

/**
 * Manual processor for normalize jobs only
 * Development only - processes queued normalize jobs
 */
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "normalize_processing" },
})(async ({ userId }) => {
  try {
    const result = await JobProcessingService.processNormalizationJobs(userId);

    return NextResponse.json({
      ok: true,
      data: {
        message: result.message,
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to process normalize jobs",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
});

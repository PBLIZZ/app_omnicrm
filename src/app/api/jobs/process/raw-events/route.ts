import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { apiError } from "@/server/api/response";
import { JobCreationService } from "@/server/services/job-creation.service";
import { logger } from "@/lib/observability/unified-logger";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * Manual processor for raw_events → interactions transformation
 * Development only - creates normalize jobs for Gmail raw events
 */
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "manual_job_process" },
})(async ({ userId, requestId }) => {

  try {
    const result = await JobCreationService.createRawEventJobs(userId);

    return NextResponse.json({
      message: result.message,
      processed: result.processed,
      totalRawEvents: result.totalItems,
    });

  } catch (error) {
    await logger.error(
      "Failed to process raw events",
      {
        operation: "manual_raw_events_processor",
        additionalData: {
          userId: userId,
        },
      },
      ensureError(error),
    );

    return apiError(
      "Failed to process raw events",
      "INTERNAL_ERROR",
      { message: error instanceof Error ? error.message : "Unknown error" },
      ensureError(error),
    );
  }
});

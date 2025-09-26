import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { JobCreationService } from "@/server/services/job-creation.service";

/**
 * Manual processor for raw_events → interactions transformation
 * Development only - creates normalize jobs for Gmail raw events
 */
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "raw_events_processing" },
})(async ({ userId }) => {
  try {
    const result = await JobCreationService.createRawEventJobs(userId);

    return NextResponse.json({
      ok: true,
      data: {
        message: result.message,
        processed: result.processed,
        totalRawEvents: result.totalItems,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to process raw events",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
});

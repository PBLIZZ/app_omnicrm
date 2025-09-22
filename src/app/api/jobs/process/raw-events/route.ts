import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { JobCreationService } from "@/server/services/job-creation.service";
import { logger } from "@/lib/observability/unified-logger";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * Manual processor for raw_events → interactions transformation
 * Development only - creates normalize jobs for Gmail raw events
 */
export async function POST(_: NextRequest): Promise<NextResponse> {
  let userId: string | undefined;
  try {
    userId = await getServerUserId();
    const result = await JobCreationService.createRawEventJobs(userId);

    return NextResponse.json({
      message: result.message,
      processed: result.processed,
      totalRawEvents: result.totalItems,
    });
  } catch (error) {
    console.error("POST /api/jobs/process/raw-events error:", error);
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

    return NextResponse.json({ error: "Failed to process raw events" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { JobRunner } from "@/server/jobs/runner";
import { logger } from "@/lib/observability";

/**
 * Manual job processing endpoint for testing and manual triggers
 * POST /api/jobs/process
 */
export async function POST(_: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    logger.progress("Processing jobs...", "Manual job processing started");
    await logger.info("Manual job processing triggered by user", {
      operation: "manual_job_processing",
      userId,
    });

    const runner = new JobRunner();

    // Process jobs (can be user-specific or all jobs)
    const result = await runner.processPendingJobs(50); // Process up to 50 jobs

    logger.success(
      "Jobs processed successfully",
      `Processed: ${result.processed}, Succeeded: ${result.succeeded}, Failed: ${result.failed}`,
      {
        description: `Successfully processed ${result.processed} jobs`,
      },
    );

    return NextResponse.json({
      success: true,
      message: "Jobs processed successfully",
      ...result,
    });
  } catch (error) {
    console.error("POST /api/jobs/process error:", error);
    return NextResponse.json(
      { error: "Manual job processing failed" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { logger } from "@/lib/observability";
import { JobRunner } from "@/server/jobs/runner";

export async function POST(_: NextRequest): Promise<NextResponse> {
  let userId: string | undefined;
  try {
    userId = await getServerUserId();

    // Use the new JobRunner to process queued jobs
    const jobRunner = new JobRunner();

    // Process jobs for the authenticated user
    const result = await jobRunner.processUserJobs(userId);

    await logger.info("Job runner processing completed", {
      operation: "job_runner.complete",
      additionalData: {
        userId,
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        errorCount: result.errors.length,
      },
    });

    return NextResponse.json({
      message: `Processed ${result.processed} jobs: ${result.succeeded} succeeded, ${result.failed} failed`,
      runner: "job_runner",
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logger.error(
      "Simple job processing failed",
      {
        operation: "job_runner.simple_failed",
        additionalData: {
          userId,
        },
      },
      error instanceof Error ? error : new Error(errorMessage),
    );

    // SECURITY: Don't expose internal error details to client
    return NextResponse.json(
      { error: "Job processing failed due to internal error" },
      { status: 500 }
    );
  }
}

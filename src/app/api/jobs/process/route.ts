import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { JobRunner } from "@/server/jobs/runner";
import { toApiError } from "@/server/jobs/types";

/**
 * Manual job processing endpoint for testing and manual triggers
 * POST /api/jobs/process
 */
export async function POST(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return new NextResponse(JSON.stringify({ error: "unauthorized", message }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log("Manual job processing triggered by user:", userId);
    const runner = new JobRunner();

    // Process jobs (can be user-specific or all jobs)
    const result = await runner.processPendingJobs(50); // Process up to 50 jobs

    console.log(`Manual job processing completed. Processed: ${result.processed}, Succeeded: ${result.succeeded}, Failed: ${result.failed}`);
    
    return NextResponse.json({
      success: true,
      message: "Jobs processed successfully",
      ...result
    });

  } catch (error) {
    console.error("Manual job processing failed:", error);
    return new NextResponse(JSON.stringify({
      success: false,
      error: "processing_failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
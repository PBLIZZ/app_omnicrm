import { NextRequest, NextResponse } from "next/server";
import { JobRunner } from "@/server/jobs/runner";

/**
 * This is the API endpoint that our Supabase cron job will call.
 * It is responsible for processing any pending jobs in the queue.
 */
export async function POST(req: NextRequest): Promise<Response> {
  // 1. --- Secure the Endpoint ---
  // This is critical. We only want to allow requests from our own cron job.
  const authToken = (req.headers.get("authorization") || "").split("Bearer ").at(1);

  if (authToken !== process.env["CRON_SECRET"]) {
    console.warn("CRON - Unauthorized access attempt");
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. --- Run the Job Processor ---
  try {
    console.log("CRON - Job processor starting...");
    const runner = new JobRunner();

    // Process pending jobs using the new cron-based approach
    const result = await runner.processPendingJobs();

    console.log(
      `CRON - Job processor finished. Processed: ${result.processed}, Failed: ${result.failed}`,
    );

    return NextResponse.json({
      success: true,
      message: "Job processor ran successfully.",
      ...result,
    });
  } catch (error) {
    console.error("CRON - A critical error occurred in the job runner:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "runner_exception",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { JobRunner } from "@/server/jobs/runner";
import { getDb } from "@/server/db/client";
import { jobs } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "@/lib/observability/unified-logger";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * Manual processor for normalize jobs only
 * Development only - processes queued normalize jobs
 */
export async function POST(_: NextRequest): Promise<NextResponse> {
  let userId: string | undefined;
  try {
    userId = await getServerUserId();
    const db = await getDb();
    const runner = new JobRunner();

    // Get queued normalize jobs for this user
    const normalizeJobs = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          eq(jobs.status, "queued"),
          inArray(jobs.kind, ["normalize", "normalize_google_email", "normalize_google_event"])
        )
      )
      .limit(20); // Process in smaller batches for manual processing

    if (normalizeJobs.length === 0) {
      return NextResponse.json({
        message: "No normalize jobs found to process",
        processed: 0,
      });
    }

    await logger.info(`Starting manual normalize processing for ${normalizeJobs.length} jobs`, {
      operation: "manual_normalize_processor",
      additionalData: {
        userId: userId,
        jobCount: normalizeJobs.length,
      },
    });

    // Process the normalize jobs
    const result = await runner.processUserJobs(userId, normalizeJobs.length);

    await logger.info(`Manual normalize processing complete`, {
      operation: "manual_normalize_processor",
      additionalData: {
        userId: userId,
        ...result,
      },
    });

    return NextResponse.json({
      message: `Processed ${result.processed} normalize jobs. Success: ${result.succeeded}, Failed: ${result.failed}`,
      ...result,
    });

  } catch (error) {
    await logger.error(
      "Failed to process normalize jobs",
      {
        operation: "manual_normalize_processor",
        additionalData: {
          userId: userId,
        },
      },
      ensureError(error),
    );
    
    return NextResponse.json(
      { error: "Failed to process normalize jobs" },
      { status: 500 }
    );
  }
}

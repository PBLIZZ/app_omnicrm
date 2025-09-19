import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
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
export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "manual_job_process" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("manual_normalize_processor", requestId);

  try {
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
      return api.success({
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

    return api.success({
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
    
    return api.error(
      "Failed to process normalize jobs",
      "INTERNAL_ERROR",
      { message: error instanceof Error ? error.message : "Unknown error" },
      ensureError(error),
    );
  }
});

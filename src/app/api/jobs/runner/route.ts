import { getServerUserId } from "@/server/auth/user";
import type { JobError } from "@/server/jobs/types";
import { log } from "@/server/log";
import { ok, err } from "@/server/http/responses";
import { simpleJobRunner } from "@/server/jobs/simple-runner";
import { RateLimiter } from "@/server/lib/rate-limiter";

export async function POST(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const isJobError = (e: unknown): e is JobError => {
      return typeof e === "object" && e !== null && ("status" in e || "message" in e);
    };

    if (isJobError(error)) {
      const status = typeof error.status === "number" ? error.status : 401;
      const message = typeof error.message === "string" ? error.message : "Unauthorized";
      return err(status, message);
    } else {
      return err(401, "Unauthorized");
    }
  }

  try {
    // SECURITY: Apply rate limiting for job runner operations
    const rateLimitResult = RateLimiter.checkRateLimit("job_runner", userId);
    if (!rateLimitResult.allowed) {
      log.warn(
        {
          op: "job_runner.rate_limited",
          userId,
          resetTime: rateLimitResult.resetTime,
          reason: rateLimitResult.reason,
        },
        "Job runner request rate limited",
      );

      const response = err(
        429,
        `Rate limit exceeded. ${rateLimitResult.reason ?? "Try again later"}.`,
      );
      response.headers.set(
        "Retry-After",
        Math.ceil(((rateLimitResult.resetTime ?? Date.now()) - Date.now()) / 1000).toString(),
      );
      return response;
    }

    // Use the simplified job runner - basic queue processing
    await simpleJobRunner.processQueuedJobs(userId);

    log.info(
      {
        op: "job_runner.simple_complete",
        userId,
      },
      "Simple job processing completed",
    );

    return ok({
      message: "Jobs processed successfully",
      runner: "simple",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error(
      {
        op: "job_runner.simple_failed",
        userId,
        error: errorMessage,
      },
      "Simple job processing failed",
    );

    // SECURITY: Don't expose internal error details to client
    return err(500, "Job processing failed due to internal error");
  }
}

/** POST /api/sync/approve/gmail — approve Gmail sync (auth required). Errors: 404 not_found, 401 Unauthorized, 500 approve_failed */
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { logSync } from "@/server/sync/audit";
import { randomUUID } from "node:crypto";
import { enqueue } from "@/server/jobs/enqueue";
import { z } from "zod";
import { JobRunner } from "@/server/jobs/runner";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";

const approveBodySchema = z
  .object({
    // Optional context fields; keep minimal and strict
    reason: z.string().max(200).optional(),
  })
  .strict();

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "sync_approve_gmail" },
  validation: {
    body: approveBodySchema,
  },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("sync.approve.gmail", requestId);

  const gmailFlag = String(process.env["FEATURE_GOOGLE_GMAIL_RO"] ?? "").toLowerCase();
  if (!["1", "true", "yes", "on"].includes(gmailFlag)) {
    return api.error("not_found", "NOT_FOUND");
  }

  const batchId = randomUUID();
  await enqueue("google_gmail_sync", { batchId }, userId, batchId);
  await logSync(userId, "gmail", "approve", { batchId });

  // Auto-start job runner processing after enqueuing
  try {
    await logger.info("Starting automatic job runner processing after Gmail sync approval", {
      operation: "gmail_sync.auto_process_start",
      additionalData: {
        userId,
        batchId,
      },
    });

    // Start job processing in background (don't await to avoid blocking response)
    const jobRunner = new JobRunner();
    jobRunner.processUserJobs(userId).catch(async (error) => {
      await logger.error(
        "Auto job processing failed after Gmail sync approval",
        {
          operation: "gmail_sync.auto_process_failed",
          additionalData: {
            userId,
            batchId,
          },
        },
        ensureError(error),
      );
    });
  } catch (error) {
    // Log but don't fail the approval if job runner processing fails to start
    await logger.warn("Failed to start automatic job runner processing", {
      operation: "gmail_sync.auto_process_error",
      additionalData: {
        userId,
        batchId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  return api.success({
    batchId,
    message: "Gmail sync approved and job processing started automatically",
  });
});

/** POST /api/sync/approve/gmail — approve Gmail sync (auth required). Errors: 404 not_found, 401 Unauthorized, 500 approve_failed */
// no NextResponse usage; responses via helpers
import { logSync } from "@/lib/api/sync-audit";
import { randomUUID } from "node:crypto";
import { getServerUserId } from "@/server/auth/user";
import { enqueue } from "@/server/jobs/enqueue";
import { err, ok, safeJson } from "@/lib/api/http";
import { z } from "zod";
import { toApiError } from "@/server/jobs/types";
import { NextRequest } from "next/server";
import { JobRunner } from "@/server/jobs/runner";
import { log } from "@/lib/log";

const approveBodySchema = z
  .object({
    // Optional context fields; keep minimal and strict
    reason: z.string().max(200).optional(),
  })
  .strict();

export async function POST(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  const gmailFlag = String(process.env["FEATURE_GOOGLE_GMAIL_RO"] ?? "").toLowerCase();
  if (!["1", "true", "yes", "on"].includes(gmailFlag)) {
    return err(404, "not_found");
  }

  // Validate input (even if currently unused) to harden handler surface
  try {
    const raw = (await safeJson<Record<string, unknown>>(req)) ?? {};
    approveBodySchema.parse(raw);
  } catch {
    return err(400, "invalid_body");
  }

  const batchId = randomUUID();
  await enqueue("google_gmail_sync", { batchId }, userId, batchId);
  await logSync(userId, "gmail", "approve", { batchId });

  // Auto-start job runner processing after enqueuing
  try {
    log.info(
      {
        op: "gmail_sync.auto_process_start",
        userId,
        batchId,
      },
      "Starting automatic job runner processing after Gmail sync approval",
    );

    // Start job processing in background (don't await to avoid blocking response)
    const jobRunner = new JobRunner();
    jobRunner.processUserJobs(userId).catch((error) => {
      log.error(
        {
          op: "gmail_sync.auto_process_failed",
          userId,
          batchId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Auto job processing failed after Gmail sync approval",
      );
    });
  } catch (error) {
    // Log but don't fail the approval if job runner processing fails to start
    log.warn(
      {
        op: "gmail_sync.auto_process_error",
        userId,
        batchId,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to start automatic job runner processing",
    );
  }

  return ok({
    batchId,
    message: "Gmail sync approved and job processing started automatically",
  });
}

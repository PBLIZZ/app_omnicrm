/** POST /api/sync/approve/gmail — enqueue Gmail sync (auth required). Errors: 404 not_found, 401 Unauthorized */
import { logSync } from "@/server/sync/audit";
import { randomUUID } from "node:crypto";
import { getServerUserId } from "@/server/auth/user";
import { enqueue } from "@/server/jobs/enqueue";
import { err, ok } from "@/server/http/responses";
import { z } from "zod";
import { toApiError } from "@/server/jobs/types";

const approveBodySchema = z
  .object({
    // Optional context fields; keep minimal and strict
    reason: z.string().max(200).optional(),
  })
  .strict();

export async function POST(req?: Request) {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  if (process.env["FEATURE_GOOGLE_GMAIL_RO"] !== "1") {
    return err(404, "not_found");
  }

  // Validate input (even if currently unused) to harden handler surface
  try {
    const raw = await req?.json?.().catch(() => ({}));
    approveBodySchema.parse(raw ?? {});
  } catch {
    return err(400, "invalid_body");
  }

  const batchId = randomUUID();
  await enqueue("google_gmail_sync", { batchId }, userId, batchId);
  await logSync(userId, "gmail", "approve", { batchId });
  return ok({ batchId });
}

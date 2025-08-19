/** POST /api/sync/approve/calendar — approve Calendar sync (auth required). Errors: 404 not_found, 401 Unauthorized, 500 approve_failed */
// no NextResponse usage; responses via helpers
import { NextRequest } from "next/server";
import { logSync } from "@/server/sync/audit";
import { randomUUID } from "node:crypto";
import { getServerUserId } from "@/server/auth/user";
import { err, ok, safeJson } from "@/server/http/responses";
import { enqueue } from "@/server/jobs/enqueue";
import { z } from "zod";
import { toApiError } from "@/server/jobs/types";

const approveBodySchema = z
  .object({
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

  const calFlag = String(process.env["FEATURE_GOOGLE_CALENDAR_RO"] ?? "").toLowerCase();
  if (!["1", "true", "yes", "on"].includes(calFlag)) {
    return err(404, "not_found");
  }

  try {
    const raw = (await safeJson<Record<string, unknown>>(req)) ?? {};
    approveBodySchema.parse(raw);
  } catch {
    return err(400, "invalid_body");
  }

  const batchId = randomUUID();
  await enqueue("google_calendar_sync", { batchId }, userId, batchId);
  await logSync(userId, "calendar", "approve", { batchId });
  return ok({ batchId });
}

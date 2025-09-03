/** POST /api/sync/preview/drive — compute Drive preview (auth required). Errors: 404 not_found, 401 Unauthorized, 500 preview_failed */
// no NextResponse usage; responses via helpers
import { NextRequest } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { err, ok } from "@/lib/api/http";
import { z } from "zod";
import { toApiError } from "@/server/jobs/types";

const previewBodySchema = z
  .object({
    testOnly: z.boolean().optional(),
  })
  .strict();

export async function POST(req: NextRequest): Promise<Response> {
  // If the feature is disabled, treat the route as not found regardless of auth
  if (process.env["FEATURE_GOOGLE_DRIVE"] !== "1") return err(404, "drive_disabled");
  try {
    await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }
  try {
    const raw: unknown = await req.json().catch(() => ({}));
    previewBodySchema.parse(raw ?? {});
  } catch {
    return err(400, "invalid_body");
  }
  // Stub for Phase 3 shape
  return ok({ count: 0, sampleFilenames: [] });
}

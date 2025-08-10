/** POST /api/sync/preview/drive — compute Drive preview (auth required). Errors: 404 drive_disabled, 401 Unauthorized */
// NextResponse not used; using helpers
import { getServerUserId } from "@/server/auth/user";
import { err, ok } from "@/server/http/responses";
import { z } from "zod";
import { toApiError } from "@/server/jobs/types";

const previewBodySchema = z
  .object({
    testOnly: z.boolean().optional(),
  })
  .strict();

export async function POST(req: Request) {
  try {
    await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }
  if (process.env["FEATURE_GOOGLE_DRIVE"] !== "1") return err(404, "drive_disabled");
  try {
    const raw = await req.json().catch(() => ({}));
    previewBodySchema.parse(raw ?? {});
  } catch {
    return err(400, "invalid_body");
  }
  // Stub for Phase 3 shape
  return ok({ count: 0, sampleFilenames: [] });
}

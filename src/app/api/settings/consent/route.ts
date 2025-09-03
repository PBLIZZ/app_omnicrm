import type { NextRequest } from "next/server";
import { z } from "zod";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/lib/api/http";
import { toApiError } from "@/server/jobs/types";

/**
 * PUT /api/settings/consent — temporary scaffold (auth required)
 * Accepts { allowProfilePictureScraping: boolean }
 * Returns 200 OK without persistence for now.
 */
export async function PUT(req: NextRequest): Promise<Response> {
  try {
    // Ensure the request is authenticated
    await getServerUserId();

    const body = (await safeJson<Record<string, unknown>>(req)) ?? {};
    const schema = z.object({ allowProfilePictureScraping: z.boolean() }).strict();
    schema.parse(body);

    // Persistence tracked in GitHub issues #61 (DB migration) and #62 (error handling)
    return ok({});
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }
}

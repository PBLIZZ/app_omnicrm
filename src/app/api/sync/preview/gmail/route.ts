/** POST /api/sync/preview/gmail — compute Gmail preview (auth required). Errors: 404 not_found, 401 Unauthorized, 500 preview_failed */
// no NextResponse usage; responses via helpers
import { db } from "@/server/db/client";
import { userSyncPrefs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { gmailPreview } from "@/server/google/gmail";
import { logSync } from "@/server/sync/audit";
import { getServerUserId } from "@/server/auth/user";
import { err, ok } from "@/server/http/responses";
import { z } from "zod";
import { toApiError } from "@/server/jobs/types";

const previewBodySchema = z
  .object({
    testOnly: z.boolean().optional(),
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

  const prefsRow = await db
    .select()
    .from(userSyncPrefs)
    .where(eq(userSyncPrefs.userId, userId))
    .limit(1);
  const prefs = prefsRow[0] ?? {
    gmailQuery: "category:primary -in:chats -in:drafts newer_than:30d",
    gmailLabelIncludes: [],
    gmailLabelExcludes: ["Promotions", "Social", "Forums", "Updates"],
  };

  try {
    const raw = await req?.json?.().catch(() => ({}));
    previewBodySchema.parse(raw ?? {});
    const preview = await gmailPreview(userId, {
      gmailQuery: prefs.gmailQuery,
      gmailLabelIncludes: prefs.gmailLabelIncludes ?? [],
      gmailLabelExcludes: prefs.gmailLabelExcludes ?? [],
    });
    await logSync(userId, "gmail", "preview", preview as unknown as Record<string, unknown>);
    return ok(preview ?? {});
  } catch (e: any) {
    const status = e?.status === 401 ? 401 : 500;
    return err(status, "preview_failed");
  }
}

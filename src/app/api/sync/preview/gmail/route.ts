/** POST /api/sync/preview/gmail — compute Gmail preview (auth required). Errors: 404 not_found, 401 Unauthorized, 500 preview_failed */
// no NextResponse usage; responses via helpers
import { getDb } from "@/server/db/client";
import { userSyncPrefs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { gmailPreview } from "@/server/google/gmail";
import { logSync } from "@/server/sync/audit";
import { getServerUserId } from "@/server/auth/user";
import { err, ok } from "@/server/http/responses";
import { z } from "zod";
import { toApiError } from "@/server/jobs/types";
import { log } from "@/server/log";

const previewBodySchema = z
  .object({
    testOnly: z.boolean().optional(),
  })
  .strict();

export async function POST(req: Request) {
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

  try {
    const db = await getDb();
    let prefs: {
      gmailQuery: string;
      gmailLabelIncludes: string[];
      gmailLabelExcludes: string[];
    };
    try {
      const prefsRow = await db
        .select()
        .from(userSyncPrefs)
        .where(eq(userSyncPrefs.userId, userId))
        .limit(1);
      prefs = (prefsRow[0] as typeof prefs | undefined) ?? {
        gmailQuery: "category:primary -in:chats -in:drafts newer_than:30d",
        gmailLabelIncludes: [],
        gmailLabelExcludes: ["Promotions", "Social", "Forums", "Updates"],
      };
    } catch {
      // Non-fatal: default to sane prefs if table is missing or RLS prevents read
      log.warn({ op: "sync.preview.gmail", note: "prefs_query_failed" }, "preview_fallback_prefs");
      prefs = {
        gmailQuery: "category:primary -in:chats -in:drafts newer_than:30d",
        gmailLabelIncludes: [],
        gmailLabelExcludes: ["Promotions", "Social", "Forums", "Updates"],
      };
    }
    const raw = await req.json().catch(() => ({}));
    previewBodySchema.parse(raw ?? {});
    const preview = await gmailPreview(userId, {
      gmailQuery: prefs.gmailQuery,
      gmailLabelIncludes: prefs.gmailLabelIncludes ?? [],
      gmailLabelExcludes: prefs.gmailLabelExcludes ?? [],
    });
    await logSync(userId, "gmail", "preview", preview as unknown as Record<string, unknown>);
    return ok(preview ?? {});
  } catch (e: unknown) {
    const error = e as { status?: number; code?: number; message?: string };
    const unauthorized = error?.status === 401 || error?.code === 401 || error?.code === 403;
    const status = unauthorized ? 401 : 500;
    // Minimal, non-sensitive log for debugging preview failures
    log.warn(
      { op: "sync.preview.gmail", status, code: error?.code, msg: error?.message },
      "preview_failed",
    );
    return err(status, unauthorized ? "unauthorized" : "preview_failed");
  }
}

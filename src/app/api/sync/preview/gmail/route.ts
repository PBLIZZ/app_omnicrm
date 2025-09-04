/** POST /api/sync/preview/gmail — compute Gmail preview (auth required). Errors: 404 not_found, 401 Unauthorized, 500 preview_failed */
// no NextResponse usage; responses via helpers
import { NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { userSyncPrefs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { gmailPreview } from "@/server/google/gmail";
import { logSync } from "@/lib/api/sync-audit";
import { getServerUserId } from "@/server/auth/user";
import { err, ok } from "@/lib/api/http";
import { z } from "zod";
import { toApiError } from "@/server/jobs/types";
import { log } from "@/lib/log";

const previewBodySchema = z
  .object({
    testOnly: z.boolean().optional(),
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
      const prefsData = prefsRow[0] || null;
      prefs = prefsData
        ? {
            gmailQuery:
              typeof prefsData.gmailQuery === "string" ? prefsData.gmailQuery : "in:inbox", // Simplified query for testing
            gmailLabelIncludes: Array.isArray(prefsData.gmailLabelIncludes)
              ? prefsData.gmailLabelIncludes
              : [],
            gmailLabelExcludes: Array.isArray(prefsData.gmailLabelExcludes)
              ? prefsData.gmailLabelExcludes
              : ["Promotions", "Social", "Forums", "Updates"],
          }
        : {
            gmailQuery: "in:inbox", // Simplified query for testing
            gmailLabelIncludes: [],
            gmailLabelExcludes: ["Promotions", "Social", "Forums", "Updates"],
          };
    } catch {
      // Non-fatal: default to sane prefs if table is missing or RLS prevents read
      log.warn({ op: "sync.preview.gmail", note: "prefs_query_failed" }, "preview_fallback_prefs");
      prefs = {
        gmailQuery: "in:inbox", // Simplified query for testing
        gmailLabelIncludes: [],
        gmailLabelExcludes: ["Promotions", "Social", "Forums", "Updates"],
      };
    }
    const raw: unknown = await req.json().catch(() => ({}));
    previewBodySchema.parse(raw ?? {});

    console.log(`Gmail preview: Starting for user ${userId} with prefs:`, {
      gmailQuery: prefs.gmailQuery,
      gmailLabelIncludes: prefs.gmailLabelIncludes,
      gmailLabelExcludes: prefs.gmailLabelExcludes,
    });

    const preview = await gmailPreview(userId, {
      gmailQuery: prefs.gmailQuery,
      gmailLabelIncludes: prefs.gmailLabelIncludes ?? [],
      gmailLabelExcludes: prefs.gmailLabelExcludes ?? [],
    });
    // Light metrics log for observability (non-sensitive) with safe narrowing
    type PreviewMetrics = { pages?: number; itemsFiltered?: number; durationMs?: number };
    const meta: PreviewMetrics =
      typeof preview === "object" && preview !== null ? (preview as unknown as PreviewMetrics) : {};
    const pages = typeof meta.pages === "number" ? meta.pages : undefined;
    const itemsFiltered = typeof meta.itemsFiltered === "number" ? meta.itemsFiltered : undefined;
    const durationMs = typeof meta.durationMs === "number" ? meta.durationMs : undefined;
    log.info(
      { op: "gmail.preview.metrics", userId, pages, itemsFiltered, durationMs },
      "gmail_preview_metrics",
    );
    // Safe property access for preview result logging
    const previewObj = preview as unknown as Record<string, unknown>;
    const countByLabel = 'countByLabel' in previewObj ? previewObj['countByLabel'] : undefined;
    const sampleSubjects = 'sampleSubjects' in previewObj && Array.isArray(previewObj['sampleSubjects']) 
      ? previewObj['sampleSubjects'] as unknown[] : [];
    
    console.log(`Gmail preview: Final response being sent:`, {
      countByLabel,
      sampleSubjectsCount: sampleSubjects.length,
      sampleSubjects: sampleSubjects.slice(0, 3),
      previewType: typeof preview,
      previewKeys: preview ? Object.keys(preview) : [],
    });

    await logSync(userId, "gmail", "preview", preview as unknown as Record<string, unknown>);
    return ok(preview ?? {});
  } catch (e: unknown) {
    const isApiError = (
      err: unknown,
    ): err is { status?: number; code?: number; message?: string } => {
      return typeof err === "object" && err !== null;
    };

    const error = isApiError(e) ? e : {};
    const unauthorized = error.status === 401 || error.code === 401 || error.code === 403;
    const status = unauthorized ? 401 : 500;

    // Minimal, non-sensitive log for debugging preview failures
    log.warn(
      { op: "sync.preview.gmail", status, code: error.code, msg: error.message },
      "preview_failed",
    );
    return err(status, unauthorized ? "unauthorized" : "preview_failed");
  }
}

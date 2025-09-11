/** POST /api/sync/preview/gmail — compute Gmail preview (auth required). Errors: 404 not_found, 401 Unauthorized, 500 preview_failed */
import { getDb } from "@/server/db/client";
import { userSyncPrefs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { gmailPreview } from "@/server/google/gmail";
import { logSync } from "@/server/sync/audit";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { z } from "zod";
import { logger } from "@/lib/observability";

const previewBodySchema = z
  .object({
    testOnly: z.boolean().optional(),
  })
  .strict();

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "sync_preview_gmail" },
  validation: { body: previewBodySchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("sync.preview.gmail", requestId);

  const { testOnly } = validated.body;

  const gmailFlag = String(process.env["FEATURE_GOOGLE_GMAIL_RO"] ?? "").toLowerCase();
  if (!["1", "true", "yes", "on"].includes(gmailFlag)) {
    return api.error("not_found", "NOT_FOUND");
  }

  console.debug("Gmail preview request:", { userId, testOnly });

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
      const prefsData = prefsRow[0] ?? null;
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
      await logger.warn("preview_fallback_prefs", {
        operation: "sync.preview.gmail",
        additionalData: { note: "prefs_query_failed" },
      });
      prefs = {
        gmailQuery: "in:inbox", // Simplified query for testing
        gmailLabelIncludes: [],
        gmailLabelExcludes: ["Promotions", "Social", "Forums", "Updates"],
      };
    }
    // Body validation is handled by createRouteHandler

    void logger.info(`Gmail preview: Starting for user ${userId} with prefs:`, {
      operation: "sync.preview.gmail",
      additionalData: {
        gmailQuery: prefs.gmailQuery,
        gmailLabelIncludes: prefs.gmailLabelIncludes,
        gmailLabelExcludes: prefs.gmailLabelExcludes,
      },
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
    await logger.info("gmail_preview_metrics", {
      operation: "gmail.preview.metrics",
      additionalData: { userId, pages, itemsFiltered, durationMs },
    });
    // Safe property access for preview result logging
    const previewObj = preview as unknown as Record<string, unknown>;
    const countByLabel = "countByLabel" in previewObj ? previewObj["countByLabel"] : undefined;
    const sampleSubjects =
      "sampleSubjects" in previewObj && Array.isArray(previewObj["sampleSubjects"])
        ? (previewObj["sampleSubjects"] as unknown[])
        : [];

    void logger.warn("Gmail preview metrics:", {
      operation: "sync.preview.gmail",
      additionalData: { pages, itemsFiltered, durationMs },
    });

    void logger.warn(`Gmail preview: Final response being sent:`, {
      operation: "sync.preview.gmail",
      additionalData: {
        countByLabel,
        sampleSubjectsCount: sampleSubjects.length,
        sampleSubjects: sampleSubjects.slice(0, 3),
        previewType: typeof preview,
        previewKeys: preview ? Object.keys(preview) : [],
      },
    });

    await logSync(userId, "gmail", "preview", preview as unknown as Record<string, unknown>);
    return api.success(preview ?? {});
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
    await logger.warn("preview_failed", {
      operation: "sync.preview.gmail",
      additionalData: { status, code: error.code, msg: error.message },
    });
    return api.error(
      unauthorized ? "unauthorized" : "preview_failed",
      unauthorized ? "UNAUTHORIZED" : "INTERNAL_ERROR",
    );
  }
});

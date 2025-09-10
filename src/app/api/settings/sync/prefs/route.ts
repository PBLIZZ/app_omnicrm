/** GET/PUT /api/settings/sync/prefs — read/write sync preferences (auth required). Errors: 401 Unauthorized, 400 invalid_body */
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { eq } from "drizzle-orm";
import { userSyncPrefs } from "@/server/db/schema";
import { UserSyncPrefsUpdateSchema } from "@/lib/validation/schemas";
import { ensureError } from "@/lib/utils/error-handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "sync_prefs_get" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("settings.sync.prefs.get", requestId);

  try {
    const dbo = await getDb();
    const rows = await dbo
      .select()
      .from(userSyncPrefs)
      .where(eq(userSyncPrefs.userId, userId))
      .limit(1);
    const p = rows[0] ?? {
      gmailQuery: "category:primary -in:chats -in:drafts newer_than:30d",
      gmailLabelIncludes: [],
      gmailLabelExcludes: ["Promotions", "Social", "Forums", "Updates"],
      calendarIncludeOrganizerSelf: true,
      calendarIncludePrivate: false,
      calendarTimeWindowDays: 60,
      driveIngestionMode: "none",
      driveFolderIds: [],
    };
    return api.success(p);
  } catch (error: unknown) {
    return api.error(
      "Failed to get sync preferences",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

export const PUT = createRouteHandler({
  auth: true,
  rateLimit: { operation: "sync_prefs_update" },
  validation: {
    body: UserSyncPrefsUpdateSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("settings.sync.prefs.update", requestId);

  try {
    const dbo = await getDb();
    const body = validated.body;
    const toBool = (v: unknown, d: boolean): boolean => {
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v === "true";
      return d;
    };
    const rows = await dbo
      .select()
      .from(userSyncPrefs)
      .where(eq(userSyncPrefs.userId, userId))
      .limit(1);
    if (rows[0]) {
      await dbo
        .update(userSyncPrefs)
        .set({
          gmailQuery: body.gmailQuery ?? rows[0].gmailQuery,
          gmailLabelIncludes: body.gmailLabelIncludes ?? rows[0].gmailLabelIncludes,
          gmailLabelExcludes: body.gmailLabelExcludes ?? rows[0].gmailLabelExcludes,
          calendarIncludeOrganizerSelf: toBool(
            body.calendarIncludeOrganizerSelf,
            rows[0].calendarIncludeOrganizerSelf,
          ),
          calendarIncludePrivate: toBool(
            body.calendarIncludePrivate,
            rows[0].calendarIncludePrivate,
          ),
          calendarTimeWindowDays: body.calendarTimeWindowDays ?? rows[0].calendarTimeWindowDays,
          driveIngestionMode: body.driveIngestionMode ?? rows[0].driveIngestionMode,
          driveFolderIds: body.driveFolderIds ?? rows[0].driveFolderIds,
          updatedAt: new Date(),
        })
        .where(eq(userSyncPrefs.userId, userId));
    } else {
      await dbo.insert(userSyncPrefs).values({
        userId,
        gmailQuery: body.gmailQuery,
        gmailLabelIncludes: body.gmailLabelIncludes ?? [],
        gmailLabelExcludes: body.gmailLabelExcludes ?? [
          "Promotions",
          "Social",
          "Forums",
          "Updates",
        ],
        calendarIncludeOrganizerSelf: toBool(body.calendarIncludeOrganizerSelf, true),
        calendarIncludePrivate: toBool(body.calendarIncludePrivate, false),
        calendarTimeWindowDays: body.calendarTimeWindowDays ?? 60,
        driveIngestionMode: body.driveIngestionMode ?? "none",
        driveFolderIds: body.driveFolderIds ?? [],
      });
    }
    return api.success({});
  } catch (error: unknown) {
    return api.error(
      "Failed to update sync preferences",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

/**
 * GET/PUT /api/google/prefs — Google sync preferences management
 *
 * Manages user preferences for Google Gmail and Calendar sync operations.
 * Replaces the deprecated /api/settings/sync/prefs endpoint.
 */
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { eq } from "drizzle-orm";
import { userSyncPrefs } from "@/server/db/schema";
import { UserSyncPrefsUpdateSchema } from "@/lib/validation/schemas";
import { ensureError } from "@/lib/utils/error-handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_prefs_get" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("google.prefs.get", requestId);

  try {
    const dbo = await getDb();
    const rows = await dbo
      .select()
      .from(userSyncPrefs)
      .where(eq(userSyncPrefs.userId, userId))
      .limit(1);

    const prefs = rows[0] ?? {
      gmailQuery: "category:primary -in:chats -in:drafts newer_than:30d",
      gmailLabelIncludes: [],
      gmailLabelExcludes: ["Promotions", "Social", "Forums", "Updates"],
      gmailTimeRangeDays: 365,
      calendarIncludeOrganizerSelf: true,
      calendarIncludePrivate: false,
      calendarTimeWindowDays: 365,
      calendarIds: [],
      calendarFutureDays: 90,
      driveIngestionMode: "none",
      driveFolderIds: [],
      driveMaxSizeMB: 5,
      initialSyncCompleted: false,
      initialSyncDate: null,
    };

    return api.success(prefs);
  } catch (error: unknown) {
    return api.error(
      "Failed to get Google sync preferences",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

export const PUT = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_prefs_update" },
  validation: {
    body: UserSyncPrefsUpdateSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("google.prefs.update", requestId);

  try {
    const dbo = await getDb();
    const body = validated.body;

    const toBool = (v: unknown, defaultValue: boolean): boolean => {
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v === "true";
      return defaultValue;
    };

    const rows = await dbo
      .select()
      .from(userSyncPrefs)
      .where(eq(userSyncPrefs.userId, userId))
      .limit(1);

    if (rows[0]) {
      // Check if initial sync is completed and prevent modification of certain settings
      const existingPrefs = rows[0];

      // Prevent modification of time range settings after initial sync
      if (existingPrefs.initialSyncCompleted) {
        if (body.gmailTimeRangeDays && body.gmailTimeRangeDays !== existingPrefs.gmailTimeRangeDays) {
          return api.error(
            "Gmail time range cannot be changed after initial sync",
            "VALIDATION_ERROR",
            "The Gmail time range is set during the first sync and cannot be modified later."
          );
        }
        if (body.calendarTimeWindowDays && body.calendarTimeWindowDays !== existingPrefs.calendarTimeWindowDays) {
          return api.error(
            "Calendar time window cannot be changed after initial sync",
            "VALIDATION_ERROR",
            "The calendar time window is set during the first sync and cannot be modified later."
          );
        }
        if (body.calendarFutureDays && body.calendarFutureDays !== existingPrefs.calendarFutureDays) {
          return api.error(
            "Calendar future days cannot be changed after initial sync",
            "VALIDATION_ERROR",
            "The calendar future days setting is set during the first sync and cannot be modified later."
          );
        }
      }

      // Update existing preferences
      await dbo
        .update(userSyncPrefs)
        .set({
          gmailQuery: body.gmailQuery ?? existingPrefs.gmailQuery,
          gmailLabelIncludes: body.gmailLabelIncludes ?? existingPrefs.gmailLabelIncludes,
          gmailLabelExcludes: body.gmailLabelExcludes ?? existingPrefs.gmailLabelExcludes,
          gmailTimeRangeDays: body.gmailTimeRangeDays ?? existingPrefs.gmailTimeRangeDays,
          calendarIncludeOrganizerSelf: toBool(
            body.calendarIncludeOrganizerSelf,
            existingPrefs.calendarIncludeOrganizerSelf,
          ),
          calendarIncludePrivate: toBool(
            body.calendarIncludePrivate,
            existingPrefs.calendarIncludePrivate,
          ),
          calendarTimeWindowDays: body.calendarTimeWindowDays ?? existingPrefs.calendarTimeWindowDays,
          calendarIds: body.calendarIds ?? existingPrefs.calendarIds,
          calendarFutureDays: body.calendarFutureDays ?? existingPrefs.calendarFutureDays,
          driveIngestionMode: body.driveIngestionMode ?? existingPrefs.driveIngestionMode,
          driveFolderIds: body.driveFolderIds ?? existingPrefs.driveFolderIds,
          driveMaxSizeMB: body.driveMaxSizeMB ?? existingPrefs.driveMaxSizeMB,
          initialSyncCompleted: body.initialSyncCompleted ?? existingPrefs.initialSyncCompleted,
          initialSyncDate: body.initialSyncDate ? new Date(body.initialSyncDate) : existingPrefs.initialSyncDate,
          updatedAt: new Date(),
        })
        .where(eq(userSyncPrefs.userId, userId));
    } else {
      // Create new preferences record
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
        gmailTimeRangeDays: body.gmailTimeRangeDays ?? 365,
        calendarIncludeOrganizerSelf: toBool(body.calendarIncludeOrganizerSelf, true),
        calendarIncludePrivate: toBool(body.calendarIncludePrivate, false),
        calendarTimeWindowDays: body.calendarTimeWindowDays ?? 365,
        calendarIds: body.calendarIds ?? [],
        calendarFutureDays: body.calendarFutureDays ?? 90,
        driveIngestionMode: body.driveIngestionMode ?? "none",
        driveFolderIds: body.driveFolderIds ?? [],
        driveMaxSizeMB: body.driveMaxSizeMB ?? 5,
        initialSyncCompleted: body.initialSyncCompleted ?? false,
        initialSyncDate: body.initialSyncDate ? new Date(body.initialSyncDate) : null,
      });
    }

    return api.success({});
  } catch (error: unknown) {
    return api.error(
      "Failed to update Google sync preferences",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
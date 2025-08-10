/** GET/PUT /api/settings/sync/prefs — read/write sync preferences (auth required). Errors: 401 Unauthorized, 400 invalid_body */
import type { NextRequest } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { db } from "@/server/db/client";
import { eq } from "drizzle-orm";
import { userSyncPrefs } from "@/server/db/schema";
import { err, ok } from "@/server/http/responses";
import { toApiError } from "@/server/jobs/types";

export async function GET() {
  try {
    const userId = await getServerUserId();
    const rows = await db
      .select()
      .from(userSyncPrefs)
      .where(eq(userSyncPrefs.userId, userId))
      .limit(1);
    const p = rows[0] ?? {
      gmailQuery: "category:primary -in:chats -in:drafts newer_than:30d",
      gmailLabelIncludes: [],
      gmailLabelExcludes: ["Promotions", "Social", "Forums", "Updates"],
      calendarIncludeOrganizerSelf: "true",
      calendarIncludePrivate: "false",
      calendarTimeWindowDays: 60,
      driveIngestionMode: "none",
      driveFolderIds: [],
    };
    return ok(p);
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getServerUserId();
    const body = await req.json();
    const rows = await db
      .select()
      .from(userSyncPrefs)
      .where(eq(userSyncPrefs.userId, userId))
      .limit(1);
    if (rows[0]) {
      await db
        .update(userSyncPrefs)
        .set({
          gmailQuery: body.gmailQuery ?? rows[0].gmailQuery,
          gmailLabelIncludes: body.gmailLabelIncludes ?? rows[0].gmailLabelIncludes,
          gmailLabelExcludes: body.gmailLabelExcludes ?? rows[0].gmailLabelExcludes,
          calendarIncludeOrganizerSelf:
            body.calendarIncludeOrganizerSelf ?? rows[0].calendarIncludeOrganizerSelf,
          calendarIncludePrivate: body.calendarIncludePrivate ?? rows[0].calendarIncludePrivate,
          calendarTimeWindowDays: body.calendarTimeWindowDays ?? rows[0].calendarTimeWindowDays,
          driveIngestionMode: body.driveIngestionMode ?? rows[0].driveIngestionMode,
          driveFolderIds: body.driveFolderIds ?? rows[0].driveFolderIds,
          updatedAt: new Date(),
        })
        .where(eq(userSyncPrefs.userId, userId));
    } else {
      await db.insert(userSyncPrefs).values({
        userId,
        gmailQuery: body.gmailQuery,
        gmailLabelIncludes: body.gmailLabelIncludes ?? [],
        gmailLabelExcludes: body.gmailLabelExcludes ?? [
          "Promotions",
          "Social",
          "Forums",
          "Updates",
        ],
        calendarIncludeOrganizerSelf: body.calendarIncludeOrganizerSelf ?? "true",
        calendarIncludePrivate: body.calendarIncludePrivate ?? "false",
        calendarTimeWindowDays: body.calendarTimeWindowDays ?? 60,
        driveIngestionMode: body.driveIngestionMode ?? "none",
        driveFolderIds: body.driveFolderIds ?? [],
      });
    }
    return ok({});
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }
}

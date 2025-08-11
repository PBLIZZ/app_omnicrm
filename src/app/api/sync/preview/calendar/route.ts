/** POST /api/sync/preview/calendar — compute Calendar preview (auth required). Errors: 404 not_found, 401 Unauthorized, 500 preview_failed */
// no NextResponse usage; responses via helpers
import { getDb } from "@/server/db/client";
import { userSyncPrefs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { calendarPreview } from "@/server/google/calendar";
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

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  const calFlag = String(process.env["FEATURE_GOOGLE_CALENDAR_RO"] ?? "").toLowerCase();
  if (!["1", "true", "yes", "on"].includes(calFlag)) {
    return err(404, "not_found");
  }

  try {
    const db = await getDb();
    const prefsRow = await db
      .select()
      .from(userSyncPrefs)
      .where(eq(userSyncPrefs.userId, userId))
      .limit(1);
    const prefs = prefsRow[0] ?? {
      calendarIncludeOrganizerSelf: true,
      calendarIncludePrivate: false,
      calendarTimeWindowDays: 60,
    };
    const raw = await req.json().catch(() => ({}));
    previewBodySchema.parse(raw ?? {});
    const preview = await calendarPreview(userId, {
      calendarIncludeOrganizerSelf: Boolean(prefs.calendarIncludeOrganizerSelf),
      calendarIncludePrivate: Boolean(prefs.calendarIncludePrivate),
      calendarTimeWindowDays: prefs.calendarTimeWindowDays,
    });
    await logSync(userId, "calendar", "preview", preview as unknown as Record<string, unknown>);
    return ok(preview);
  } catch (e: unknown) {
    const error = e as { status?: number };
    const status = error?.status === 401 ? 401 : 500;
    return err(status, "preview_failed");
  }
}

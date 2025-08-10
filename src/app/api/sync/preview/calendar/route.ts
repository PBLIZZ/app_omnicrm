import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { userSyncPrefs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { calendarPreview } from "@/server/google/calendar";
import { logSync } from "@/server/sync/audit";
import { getServerUserId } from "@/server/auth/user";

export async function POST() {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: any) {
    const status = e?.status ?? 401;
    return NextResponse.json({ error: e.message ?? "Unauthorized" }, { status });
  }

  if (process.env["FEATURE_GOOGLE_CALENDAR_RO"] !== "1") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const prefsRow = await db
    .select()
    .from(userSyncPrefs)
    .where(eq(userSyncPrefs.userId, userId))
    .limit(1);
  const prefs = prefsRow[0] ?? {
    calendarIncludeOrganizerSelf: "true" as const,
    calendarIncludePrivate: "false" as const,
    calendarTimeWindowDays: 60,
  };

  try {
    const preview = await calendarPreview(userId, {
      calendarIncludeOrganizerSelf: prefs.calendarIncludeOrganizerSelf,
      calendarIncludePrivate: prefs.calendarIncludePrivate,
      calendarTimeWindowDays: prefs.calendarTimeWindowDays,
    });
    await logSync(userId, "calendar", "preview", preview as unknown as Record<string, unknown>);
    return NextResponse.json(preview);
  } catch (e: any) {
    const status = e?.status === 401 ? 401 : 500;
    return NextResponse.json({ error: e?.message ?? "preview_failed" }, { status });
  }
}

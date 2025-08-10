import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { jobs } from "@/server/db/schema";
import { logSync } from "@/server/sync/audit";
import { randomUUID } from "node:crypto";
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

  const batchId = randomUUID();
  await db.insert(jobs).values({
    userId,
    kind: "google_calendar_sync",
    payload: { batchId },
    batchId,
  });
  await logSync(userId, "calendar", "approve", { batchId });
  return NextResponse.json({ ok: true, batchId });
}

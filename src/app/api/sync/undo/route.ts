import type { NextRequest } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { db } from "@/server/db/client";
import { and, eq } from "drizzle-orm";
import { interactions, jobs, rawEvents } from "@/server/db/schema";
import { err, ok, safeJson } from "@/server/lib/http";
import { toApiError } from "@/server/jobs/types";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  const body = (await safeJson<{ batchId?: string }>(req)) ?? {};
  const batchId = body?.batchId as string | undefined;
  if (!batchId) return err(400, "missing_batchId");

  // delete raw_events and interactions for this batch
  await db
    .delete(rawEvents)
    .where(and(eq(rawEvents.userId, userId), eq(rawEvents.batchId, batchId)));
  await db
    .delete(interactions)
    .where(and(eq(interactions.userId, userId), eq(interactions.batchId, batchId)));
  // mark jobs reverted (optional: set status)
  await db
    .update(jobs)
    .set({ status: "done", updatedAt: new Date() })
    .where(and(eq(jobs.userId, userId), eq(jobs.batchId, batchId)));

  return ok({ undone: batchId });
}

import { getDb } from "@/server/db/client";
import type { JobKind, JobPayloadByKind } from "./types";
import { jobs } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function enqueue<K extends JobKind>(
  kind: K,
  payload: JobPayloadByKind[K],
  userId: string,
  batchId?: string,
): Promise<void> {
  const db = await getDb();
  
  // Check for existing job to prevent duplicates when batchId is provided
  if (batchId) {
    const existingJob = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(
        eq(jobs.userId, userId),
        eq(jobs.kind, kind),
        eq(jobs.batchId, batchId),
        inArray(jobs.status, ['queued', 'processing'])
      ))
      .limit(1);

    if (existingJob.length > 0) {
      // Job already exists, skip duplicate
      return;
    }
  }
  
  // Use Drizzle ORM insert (which now works with postgres.js)
  const insertData = {
    kind,
    payload: payload as unknown,
    userId,
    status: 'queued' as const,
    ...(batchId && { batchId }),
  };
  
  await db.insert(jobs).values(insertData);
}

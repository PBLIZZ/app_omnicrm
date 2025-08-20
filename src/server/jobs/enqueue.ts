import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import type { JobKind, JobPayloadByKind } from "./types";

export async function enqueue<K extends JobKind>(
  kind: K,
  payload: JobPayloadByKind[K],
  userId: string,
  batchId?: string,
): Promise<void> {
  const insertSql = batchId
    ? sql`
      insert into jobs (kind, payload, user_id, status, batch_id)
      values (${kind}, ${payload as object}, ${userId}::uuid, 'queued', ${batchId}::uuid)
    `
    : sql`
      insert into jobs (kind, payload, user_id, status)
      values (${kind}, ${payload as object}, ${userId}::uuid, 'queued')
    `;
  const dbo = await getDb();
  await dbo.execute(insertSql);
}

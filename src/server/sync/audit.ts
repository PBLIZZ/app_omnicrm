import { db } from "@/server/db/client";
import { syncAudit } from "@/server/db/schema";

export async function logSync(
  userId: string,
  provider: "gmail" | "calendar" | "drive",
  action: "preview" | "approve" | "undo",
  payload: unknown,
) {
  await db.insert(syncAudit).values({
    userId,
    provider,
    action,
    payload: payload as any,
    createdAt: new Date(),
    id: crypto.randomUUID(),
  });
}

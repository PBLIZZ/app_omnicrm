import { getDb } from "@/server/db/client";
import { syncAudit } from "@/server/db/schema";

export async function logSync(
  userId: string,
  provider: "gmail" | "calendar" | "drive",
  action: "preview" | "approve" | "undo",
  payload: unknown,
) {
  // If a database is not configured (e.g., local dev without DATABASE_URL),
  // skip audit logging rather than failing the primary request flow.
  if (!process.env["DATABASE_URL"]) return;

  try {
    const db = await getDb();
    await db.insert(syncAudit).values({
      userId,
      provider,
      action,
      // Drizzle's jsonb typing accepts unknown; preserve payload as-is
      payload: payload as unknown as object,
      createdAt: new Date(),
      id: crypto.randomUUID(),
    });
  } catch (error) {
    // Best-effort logging; never block the request on audit failures

    console.warn("[logSync] failed to write audit row", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

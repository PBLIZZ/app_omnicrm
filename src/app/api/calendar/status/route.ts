import { ok, err } from "@/lib/api/http";
import { eq, and } from "drizzle-orm";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";

// GET: Return calendar connection status only
export async function GET(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error) {
    return err(401, "unauthorized", {
      details: error instanceof Error ? error.message : "Authentication failed",
    });
  }

  try {
    const db = await getDb();

    // Check if user has Google Calendar integration
    const integration = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google"),
          eq(userIntegrations.service, "calendar"),
        ),
      )
      .limit(1);

    return ok({
      isConnected: !!integration[0],
    });
  } catch (error) {
    return err(500, "database_error", {
      details: error instanceof Error ? error.message : "Database error",
    });
  }
}

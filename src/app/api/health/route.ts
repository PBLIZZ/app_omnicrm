import { handlePublicGet } from "@/lib/api-edge-cases";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import {
  HealthResponseSchema,
  type HealthResponse
} from "@/server/db/business-schemas";

export const GET = handlePublicGet(
  HealthResponseSchema,
  async (): Promise<HealthResponse> => {
    // Minimal self-check: if DB is configured, attempt a quick ping without blocking the response
    let dbOk: boolean | undefined = undefined;
    if (process.env["DATABASE_URL"]) {
      try {
        const dbo = await getDb();
        const ping = dbo.execute(sql`select 1`);
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 250),
        );

        try {
          await Promise.race([ping, timeout]);
          dbOk = true;
        } catch (error) {
          if (error instanceof Error && error.message === "timeout") {
            dbOk = false;
          } else {
            throw error;
          }
        }
      } catch {
        dbOk = false;
      }
    }
    return { ts: new Date().toISOString(), db: dbOk };
  }
);

import { log } from "@/server/log";
import { buildLogContext } from "@/server/log-context";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { ok } from "@/server/http/responses";

export async function GET(): Promise<Response> {
  const ctx = await buildLogContext();
  log.info({ route: "/api/health", ...ctx }, "health ping");
  // Minimal self-check: if DB is configured, attempt a quick ping without blocking the response
  let dbOk: boolean | undefined = undefined;
  if (process.env["DATABASE_URL"]) {
    try {
      const dbo = await getDb();
      const ping = dbo.execute(sql`select 1`);
      const timeout = new Promise((resolve) => setTimeout(resolve, 250));
      await Promise.race([ping, timeout]);
      dbOk = true;
    } catch {
      dbOk = false;
    }
  }
  return ok({ ts: new Date().toISOString(), db: dbOk });
}

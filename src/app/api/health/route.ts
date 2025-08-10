import { log } from "@/server/log";
import { db } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { ok } from "@/server/http/responses";

export async function GET(request: Request) {
  const reqId = request.headers.get("x-request-id") ?? undefined;
  log.info({ route: "/api/health", reqId }, "health ping");
  // Minimal self-check: if DB is configured, attempt a quick ping without blocking the response
  let dbOk: boolean | undefined = undefined;
  if (process.env["DATABASE_URL"]) {
    try {
      const ping = db.execute(sql`select 1`);
      const timeout = new Promise((resolve) => setTimeout(resolve, 250));
      await Promise.race([ping, timeout]);
      dbOk = true;
    } catch {
      dbOk = false;
    }
  }
  return ok({ ts: new Date().toISOString(), db: dbOk });
}

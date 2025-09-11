import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";

export const GET = createRouteHandler({
  auth: false,
  rateLimit: { operation: "health_check" },
})(async ({ requestId }) => {
  const api = new ApiResponseBuilder("health.check", requestId);

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
  return api.success({ ts: new Date().toISOString(), db: dbOk });
});

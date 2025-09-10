import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";

export const GET = createRouteHandler({
  auth: false,
  rateLimit: { operation: "db_ping" },
})(async ({ requestId }) => {
  const api = new ApiResponseBuilder("db_ping", requestId);

  try {
    const dbo = await getDb();
    await dbo.execute(sql`select 1`);
    return api.success({ status: "healthy" });
  } catch (error) {
    return api.databaseError(
      "Database connection failed",
      error instanceof Error ? error : new Error("Unknown database error"),
    );
  }
});

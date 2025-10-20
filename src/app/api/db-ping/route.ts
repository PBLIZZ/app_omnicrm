import { handlePublicGet } from "@/lib/api-edge-cases";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { ErrorHandler } from "@/lib/errors/app-error";
import { DbPingResponseSchema, type DbPingResponse } from "@/server/db/business-schemas";

export const GET = handlePublicGet(DbPingResponseSchema, async (): Promise<DbPingResponse> => {
  try {
    const dbo = await getDb();
    await dbo.execute(sql`select 1`);

    return {
      status: "healthy" as const,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    // Convert database connection errors to proper AppError
    throw ErrorHandler.databaseError("Database connection failed");
  }
});

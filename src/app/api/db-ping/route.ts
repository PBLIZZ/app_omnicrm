import { handlePublicGet } from "@/lib/api-edge-cases";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import {
  DbPingResponseSchema,
  type DbPingResponse
} from "@/server/db/business-schemas";

export const GET = handlePublicGet(
  DbPingResponseSchema,
  async (): Promise<DbPingResponse> => {
    const dbo = await getDb();
    await dbo.execute(sql`select 1`);

    return {
      status: "healthy" as const,
      timestamp: new Date().toISOString(),
    };
  }
);

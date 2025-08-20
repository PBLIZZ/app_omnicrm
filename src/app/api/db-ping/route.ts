// src/app/api/db-ping/route.ts
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { ok, err } from "@/server/http/responses";

export async function GET(): Promise<Response> {
  try {
    const dbo = await getDb();
    await dbo.execute(sql`select 1`);
    return ok({});
  } catch {
    return err(500, "db_error");
  }
}

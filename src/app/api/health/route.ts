import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";

export async function GET(): Promise<NextResponse> {
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
  return NextResponse.json({ ts: new Date().toISOString(), db: dbOk });
}

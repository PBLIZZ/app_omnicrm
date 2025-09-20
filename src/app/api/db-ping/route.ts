import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";

export const GET = createRouteHandler({
  auth: false,
  rateLimit: { operation: "db_ping" },
})(async ({}) => {
  try {
    const dbo = await getDb();
    await dbo.execute(sql`select 1`);
    return NextResponse.json({ status: "healthy" });
  } catch (error) {
    console.error("Database ping failed:", error);
    return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
  }
});

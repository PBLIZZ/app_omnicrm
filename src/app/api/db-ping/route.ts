// src/app/api/db-ping/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const dbo = await getDb();
    await dbo.execute(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

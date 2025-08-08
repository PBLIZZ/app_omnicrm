// src/app/api/db-ping/route.ts
import { NextResponse } from "next/server";
import { dbPing } from "@/server/db/client";

export async function GET() {
  const ok = await dbPing();
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}
import { NextResponse } from "next/server";
import { log } from "@/server/log";

export async function GET(request: Request) {
  const reqId = request.headers.get("x-request-id") ?? undefined;
  log.info({ route: "/api/health", reqId }, "health ping");
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}

import { NextResponse } from "next/server";
import { log } from "@/server/log";

type ErrorShape = {
  ok: false;
  error: string;
  details?: Record<string, unknown> | null;
};

type OkShape<T> = {
  ok: true;
  data: T;
};

export function ok<T>(data: T, init?: ResponseInit) {
  const body: OkShape<T> = { ok: true, data };
  return NextResponse.json(body, init);
}

export function err(
  status: number,
  error: string,
  details?: Record<string, unknown> | null,
  logBindings?: Record<string, unknown>,
) {
  const payload: ErrorShape = { ok: false, error, details: details ?? null };
  if (status >= 500) {
    log.error({ status, error, ...logBindings });
  } else if (status >= 400) {
    log.warn({ status, error, ...logBindings });
  }
  return NextResponse.json(payload, { status });
}

export function safeJson<T>(req: Request): Promise<T | undefined> {
  return req.json().catch(() => undefined);
}

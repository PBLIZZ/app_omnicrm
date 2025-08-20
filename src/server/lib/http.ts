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

export function ok<T>(data: T, init?: ResponseInit): NextResponse<OkShape<T>> {
  const body: OkShape<T> = { ok: true, data };
  // eslint-disable-next-line no-restricted-syntax
  return NextResponse.json(body, init);
}

export function err(
  status: number,
  error: string,
  details?: Record<string, unknown> | null,
  logBindings?: Record<string, unknown>,
): NextResponse<ErrorShape> {
  const payload: ErrorShape = { ok: false, error, details: details ?? null };
  if (status >= 500) {
    log.error({ status, error, ...logBindings });
  } else if (status >= 400) {
    log.warn({ status, error, ...logBindings });
  }
  // eslint-disable-next-line no-restricted-syntax
  return NextResponse.json(payload, { status });
}

export function safeJson<T>(req: Request): Promise<T | undefined> {
  return req.json().catch(() => undefined);
}

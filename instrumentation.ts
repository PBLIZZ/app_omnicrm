/**
 * Next.js Instrumentation File
 *
 * This file is required for proper Sentry initialization in Next.js.
 * It replaces the deprecated sentry.*.config.ts files.
 */

import { captureRequestError } from "./src/lib/sentry";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side initialization
    await import("./src/lib/sentry");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge runtime initialization
    await import("./src/lib/sentry");
  }
}

export async function onRequestError(
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
  },
) {
  // Use Sentry's captureRequestError to properly instrument request errors
  captureRequestError(err, request);
}

import { logger } from "@/lib/observability";

// Shared retry with jitter for Google API calls
export async function callWithRetry<T>(fn: () => Promise<T>, op: string, max = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = Math.min(300 * 2 ** attempt, 2000) + Math.floor(Math.random() * 200);
      if (attempt < max - 1) await new Promise((r) => setTimeout(r, delay));
    }
  }
  const error = lastErr as { message?: string };
  await logger.warn("google_call_failed", {
    operation: "api_call",
    additionalData: { op, error: String(error?.message ?? lastErr) },
  });
  throw lastErr;
}

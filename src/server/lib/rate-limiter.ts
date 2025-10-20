// SECURITY: Advanced rate limiting for compute-intensive operations (Redis-backed)

import { fallbackRateLimiter } from "./rate-limiter-fallback";

/**
 * Error type for rate limit exceeded errors
 */
interface RateLimitError extends Error {
  status: number;
  headers: {
    "Retry-After": string;
    "X-RateLimit-Remaining": string;
    "X-RateLimit-Reset": string;
  };
}

/**
 * Rate limit result interface
 */
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Simple rate limiter for operation-based limiting
 */
class OperationRateLimiter {
  private static readonly DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
  private static readonly DEFAULT_MAX_REQUESTS = 60;

  static checkRateLimit(operation: string, userId: string): RateLimitResult {
    const key = `${operation}:${userId}`;
    const config = {
      windowMs: this.DEFAULT_WINDOW_MS,
      maxRequests: this.DEFAULT_MAX_REQUESTS,
    };
    return fallbackRateLimiter.checkRateLimit(config, key);
  }
}

/**
 * Middleware wrapper for rate limiting API operations
 */
export function withRateLimit(
  operation: string,
): <T extends unknown[], R>(
  target: (...args: T) => Promise<R>,
) => (userId: string, ...args: unknown[]) => Promise<R> {
  return function <T extends unknown[], R>(target: (...args: T) => Promise<R>) {
    return async function (userId: string, ...args: unknown[]): Promise<R> {
      const result: RateLimitResult = OperationRateLimiter.checkRateLimit(operation, userId);

      if (!result.allowed) {
        const resetInMs = result.resetTime - Date.now();
        const resetInMinutes = Math.ceil(resetInMs / (60 * 1000));

        const error: RateLimitError = Object.assign(
          new Error(`Rate limit exceeded. Try again in ${resetInMinutes} minutes.`),
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(resetInMs / 1000).toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": result.resetTime.toString(),
            },
          },
        ) as RateLimitError;

        throw error;
      }

      return target(...([userId, ...args] as T));
    };
  };
}

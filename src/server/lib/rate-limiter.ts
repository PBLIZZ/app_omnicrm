// SECURITY: Advanced rate limiting for compute-intensive operations
import { logger } from "@/lib/observability";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

// In-memory store - in production, use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number; blocked?: boolean }>();

// Operation-specific rate limits
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Benchmark operations - very limited
  benchmark: { windowMs: 5 * 60 * 1000, maxRequests: 2, keyPrefix: "bench" }, // 2 per 5 min

  // Job operations - moderate limits
  job_runner: { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: "job_run" }, // 10 per minute
  job_control: { windowMs: 60 * 1000, maxRequests: 20, keyPrefix: "job_ctrl" }, // 20 per minute

  // AI operations - limited to prevent abuse
  ai_chat: { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: "ai_chat" }, // 30 per minute
  ai_embedding: { windowMs: 60 * 1000, maxRequests: 100, keyPrefix: "ai_embed" }, // 100 per minute

  // Data operations - moderate limits
  user_export: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 3, keyPrefix: "export" }, // 3 per day
  user_delete: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 1, keyPrefix: "delete" }, // 1 per day

  // Sync operations
  gmail_sync: { windowMs: 5 * 60 * 1000, maxRequests: 10, keyPrefix: "gmail" }, // 10 per 5 min
  calendar_sync: { windowMs: 5 * 60 * 1000, maxRequests: 15, keyPrefix: "cal" }, // 15 per 5 min
};

export class RateLimiter {
  static {
    // Cleanup expired entries every 5 minutes
    setInterval(
      () => {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, data] of rateLimitStore.entries()) {
          if (now >= data.resetTime) {
            keysToDelete.push(key);
          }
        }

        keysToDelete.forEach((key) => rateLimitStore.delete(key));
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Check if an operation is rate limited for a user
   * @param operation - Operation type (must be in RATE_LIMITS)
   * @param userId - User ID
   * @returns { allowed: boolean, resetTime?: number, remaining?: number }
   */
  static async checkRateLimit(
    operation: string,
    userId: string,
  ): Promise<{
    allowed: boolean;
    resetTime?: number;
    remaining?: number;
    reason?: string;
  }> {
    const config = RATE_LIMITS[operation];
    if (!config) {
      await logger.warn("Unknown operation for rate limiting", {
        operation: "rate_limit",
        additionalData: {
          operation,
          userId,
        },
      });
      return { allowed: true };
    }

    const now = Date.now();
    const key = `${config.keyPrefix}:${userId}`;
    const existing = rateLimitStore.get(key);

    // Check if window has expired
    if (!existing || now >= existing.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }

    // Check if user is already blocked
    if (existing.blocked) {
      await logger.warn("Rate limited user attempted blocked operation", {
        operation: "rate_limit",
        additionalData: {
          operation,
          userId,
          resetTime: existing.resetTime,
        },
      });

      return {
        allowed: false,
        resetTime: existing.resetTime,
        reason: "Rate limit exceeded - temporarily blocked",
      };
    }

    // Check if limit exceeded
    if (existing.count >= config.maxRequests) {
      // Block user for remainder of window
      existing.blocked = true;
      rateLimitStore.set(key, existing);

      await logger.warn("User exceeded rate limit and has been blocked", {
        operation: "rate_limit",
        additionalData: {
          operation,
          userId,
          count: existing.count,
          maxRequests: config.maxRequests,
          resetTime: existing.resetTime,
        },
      });

      return {
        allowed: false,
        resetTime: existing.resetTime,
        reason: "Rate limit exceeded",
      };
    }

    // Increment counter
    existing.count++;
    rateLimitStore.set(key, existing);

    return {
      allowed: true,
      remaining: config.maxRequests - existing.count,
      resetTime: existing.resetTime,
    };
  }

  /**
   * Manually block a user from an operation (for abuse prevention)
   */
  static async blockUser(
    operation: string,
    userId: string,
    durationMs: number = 60 * 60 * 1000,
  ): Promise<void> {
    const config = RATE_LIMITS[operation];
    if (!config) return;

    const key = `${config.keyPrefix}:${userId}`;
    rateLimitStore.set(key, {
      count: config.maxRequests,
      resetTime: Date.now() + durationMs,
      blocked: true,
    });

    await logger.warn("User manually blocked from operation", {
      operation: "rate_limit",
      additionalData: {
        operation,
        userId,
        durationMs,
      },
    });
  }

  /**
   * Get current rate limit status for a user/operation
   */
  static getStatus(
    operation: string,
    userId: string,
  ): {
    remaining: number;
    resetTime: number;
    blocked: boolean;
  } | null {
    const config = RATE_LIMITS[operation];
    if (!config) return null;

    const key = `${config.keyPrefix}:${userId}`;
    const existing = rateLimitStore.get(key);

    if (!existing || Date.now() >= existing.resetTime) {
      return {
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
        blocked: false,
      };
    }

    return {
      remaining: Math.max(0, config.maxRequests - existing.count),
      resetTime: existing.resetTime,
      blocked: existing.blocked ?? false,
    };
  }

  /**
   * Clear rate limit for a user (admin function)
   */
  static async clearLimit(operation: string, userId: string): Promise<void> {
    const config = RATE_LIMITS[operation];
    if (!config) return;

    const key = `${config.keyPrefix}:${userId}`;
    rateLimitStore.delete(key);

    await logger.info("Rate limit manually cleared", {
      operation: "rate_limit",
      additionalData: {
        operation,
        userId,
      },
    });
  }
}

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
 * Middleware wrapper for rate limiting API operations
 */
export function withRateLimit(
  operation: string,
): <T extends unknown[], R>(
  target: (...args: T) => Promise<R>,
) => (userId: string, ...args: unknown[]) => Promise<R> {
  return function <T extends unknown[], R>(target: (...args: T) => Promise<R>) {
    return async function (userId: string, ...args: unknown[]): Promise<R> {
      const result = await RateLimiter.checkRateLimit(operation, userId);

      if (!result.allowed) {
        const resetInMs = (result.resetTime ?? Date.now()) - Date.now();
        const resetInMinutes = Math.ceil(resetInMs / (60 * 1000));

        const error: RateLimitError = Object.assign(
          new Error(`Rate limit exceeded. Try again in ${resetInMinutes} minutes.`),
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(resetInMs / 1000).toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": result.resetTime?.toString() ?? "",
            },
          },
        ) as RateLimitError;

        throw error;
      }

      return target(...([userId, ...args] as T));
    };
  };
}

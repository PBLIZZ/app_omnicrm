// SECURITY: Advanced rate limiting for compute-intensive operations (Redis-backed)
import { logger } from "@/lib/observability";
import { redisIncr } from "./redis-client";

// Lazy-loaded Redis client singleton
let redisClientModule: any = null;

async function getRedisClient() {
  if (!redisClientModule) {
    redisClientModule = await import("./redis-client");
  }
  return redisClientModule;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

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
    const key = `rl:${config.keyPrefix}:${userId}`;
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    // Use Redis for rate limiting
    const count = await redisIncr(key, windowSeconds);
    const resetTime = now + config.windowMs;

    if (count > config.maxRequests) {
      await logger.warn("User exceeded rate limit", {
        operation: "rate_limit",
        additionalData: {
          operation,
          userId,
          count,
          maxRequests: config.maxRequests,
        },
      });

      return {
        allowed: false,
        resetTime,
        reason: "Rate limit exceeded",
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - count,
      resetTime,
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

    const key = `rl:${config.keyPrefix}:${userId}`;
    const { redisSet } = await getRedisClient();

    // Set count to max + 1 to ensure blocking
    await redisSet(key, config.maxRequests + 1, Math.ceil(durationMs / 1000));

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
  static async getStatus(
    operation: string,
    userId: string,
  ): Promise<{
    remaining: number;
    resetTime: number;
    blocked: boolean;
  } | null> {
    const config = RATE_LIMITS[operation];
    if (!config) return null;

    const key = `rl:${config.keyPrefix}:${userId}`;
    const { redisGet } = await getRedisClient();

    try {
      const count = (await redisGet(key)) as number | null;

      if (count === null) {
        // No rate limit data, user has full quota
        return {
          remaining: config.maxRequests,
          resetTime: Date.now() + config.windowMs,
          blocked: false,
        };
      }

      return {
        remaining: Math.max(0, config.maxRequests - count),
        resetTime: Date.now() + config.windowMs, // Approximate reset time
        blocked: count > config.maxRequests,
      };
    } catch (_error) {
      // Redis error, return safe defaults
      return {
        remaining: 0,
        resetTime: Date.now() + config.windowMs,
        blocked: false,
      };
    }
  }

  /**
   * Clear rate limit for a user (admin function)
   */
  static async clearLimit(operation: string, userId: string): Promise<void> {
    const config = RATE_LIMITS[operation];
    if (!config) return;

    const key = `rl:${config.keyPrefix}:${userId}`;
    const { redisDel } = await getRedisClient();
    await redisDel(key);

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

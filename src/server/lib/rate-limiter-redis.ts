// Redis-based rate limiter for production use
// Addresses CVSS 8.2 vulnerability: Missing Rate Limiting

import { getRedisClient } from "./redis-client";
import { fallbackRateLimiter } from "./rate-limiter-fallback";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator: (req: { ip: string; userId?: string; path: string }) => string;
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Default configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // General API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    keyGenerator: (req: { ip: string; userId?: string; path: string }) =>
      `rate_limit:api:${req.ip}:${req.userId || "anonymous"}`,
  },

  // Authentication endpoints (more restrictive)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    keyGenerator: (req: { ip: string; userId?: string; path: string }) =>
      `rate_limit:auth:${req.ip}`,
  },

  // Public onboarding (very restrictive)
  onboarding: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 submissions per hour per IP
    keyGenerator: (req: { ip: string; userId?: string; path: string }) =>
      `rate_limit:onboarding:${req.ip}`,
  },

  // AI/LLM endpoints (cost protection)
  ai: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 AI requests per minute per user
    keyGenerator: (req: { ip: string; userId?: string; path: string }) =>
      `rate_limit:ai:${req.userId || req.ip}`,
  },

  // File upload endpoints
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 uploads per minute
    keyGenerator: (req: { ip: string; userId?: string; path: string }) =>
      `rate_limit:upload:${req.userId || req.ip}`,
  },
} as const;

export class RedisRateLimiter {
  private redis: ReturnType<typeof getRedisClient> | null = null;
  private useFallback = false;

  constructor() {
    try {
      this.redis = getRedisClient();
    } catch (error) {
      console.warn("Redis not available, using fallback rate limiter:", error);
      this.useFallback = true;
    }
  }

  async checkRateLimit(
    config: RateLimitConfig,
    req: { ip: string; userId?: string; path: string },
  ): Promise<RateLimitResult> {
    // Use fallback if Redis is not available
    if (this.useFallback || !this.redis) {
      const key = config.keyGenerator(req);
      const result = fallbackRateLimiter.checkRateLimit(config, key);
      return {
        ...result,
        retryAfter: result.allowed ? undefined : Math.ceil(config.windowMs / 1000),
      };
    }

    const key = config.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count current requests in window
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });

      // Set expiration
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();

      if (!results || results.length < 3) {
        throw new Error("Redis pipeline execution failed");
      }

      const currentCount = results[1] as number;
      const remaining = Math.max(0, config.maxRequests - currentCount - 1);
      const resetTime = now + config.windowMs;

      if (currentCount >= config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil(config.windowMs / 1000),
        };
      }

      return {
        allowed: true,
        remaining,
        resetTime,
      };
    } catch (error) {
      // On Redis failure, fall back to in-memory limiter
      console.error("Rate limiter Redis error, falling back to in-memory:", error);
      const key = config.keyGenerator(req);
      const result = fallbackRateLimiter.checkRateLimit(config, key);
      return {
        ...result,
        retryAfter: result.allowed ? undefined : Math.ceil(config.windowMs / 1000),
      };
    }
  }

  async getRateLimitInfo(
    config: RateLimitConfig,
    req: { ip: string; userId?: string; path: string },
  ): Promise<{ remaining: number; resetTime: number }> {
    // Use fallback if Redis is not available
    if (this.useFallback || !this.redis) {
      const key = config.keyGenerator(req);
      const result = fallbackRateLimiter.checkRateLimit(config, key);
      return {
        remaining: result.remaining,
        resetTime: result.resetTime,
      };
    }

    const key = config.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      const pipeline = this.redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcard(key);

      const results = await pipeline.exec();

      if (!results || results.length < 2) {
        throw new Error("Redis pipeline execution failed");
      }

      const currentCount = results[1] as number;
      const remaining = Math.max(0, config.maxRequests - currentCount);
      const resetTime = now + config.windowMs;

      return { remaining, resetTime };
    } catch (error) {
      console.error("Rate limiter info Redis error, using fallback:", error);
      const key = config.keyGenerator(req);
      const result = fallbackRateLimiter.checkRateLimit(config, key);
      return {
        remaining: result.remaining,
        resetTime: result.resetTime,
      };
    }
  }

  // Clear rate limit for a specific key (useful for testing or manual reset)
  async clearRateLimit(
    config: RateLimitConfig,
    req: { ip: string; userId?: string; path: string },
  ): Promise<void> {
    const key = config.keyGenerator(req);
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error("Rate limiter clear Redis error:", error);
    }
  }
}

// Global rate limiter instance
export const redisRateLimiter = new RedisRateLimiter();

// Helper function to determine rate limit config based on path
export function getRateLimitConfig(path: string): RateLimitConfig {
  if (path.startsWith("/api/auth/")) {
    return RATE_LIMIT_CONFIGS.auth;
  }
  if (path.startsWith("/api/onboarding/public/")) {
    return RATE_LIMIT_CONFIGS.onboarding;
  }
  if (path.startsWith("/api/ai/") || path.includes("/ai-")) {
    return RATE_LIMIT_CONFIGS.ai;
  }
  if (path.includes("/upload") || path.includes("/file")) {
    return RATE_LIMIT_CONFIGS.upload;
  }
  return RATE_LIMIT_CONFIGS.api;
}

// Middleware helper for Next.js API routes
export async function withRateLimit<T>(
  req: { ip: string; userId?: string; path: string },
  handler: () => Promise<T>,
): Promise<T> {
  const config = getRateLimitConfig(req.path);
  const result = await redisRateLimiter.checkRateLimit(config, req);

  if (!result.allowed) {
    const error = new Error("Rate limit exceeded") as Error & {
      status: number;
      headers: Record<string, string>;
    };
    error.status = 429;
    error.headers = {
      "Retry-After": result.retryAfter?.toString() || "60",
      "X-RateLimit-Limit": config.maxRequests.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.resetTime.toString(),
    };
    throw error;
  }

  return handler();
}

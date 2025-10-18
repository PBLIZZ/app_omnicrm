// Fallback in-memory rate limiter for when Redis is not available
// This is a temporary solution and should not be used in production

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

class FallbackRateLimiter {
  private buckets = new Map<string, RateLimitBucket>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired buckets every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(key);
      }
    }
  }

  checkRateLimit(
    config: { windowMs: number; maxRequests: number },
    key: string,
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + config.windowMs });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }

    if (bucket.count < config.maxRequests) {
      bucket.count++;
      return {
        allowed: true,
        remaining: config.maxRequests - bucket.count,
        resetTime: bucket.resetAt,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: bucket.resetAt,
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.buckets.clear();
  }
}

export const fallbackRateLimiter = new FallbackRateLimiter();

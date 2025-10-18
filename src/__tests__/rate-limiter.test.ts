import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  redisRateLimiter,
  getRateLimitConfig,
  RATE_LIMIT_CONFIGS,
} from "@/server/lib/rate-limiter-redis";

describe("Rate Limiter", () => {
  const mockReq = {
    ip: "192.168.1.1",
    userId: "test-user-123",
    path: "/api/contacts",
  };

  beforeEach(() => {
    // Clear any existing rate limits
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up rate limits after each test
    try {
      await redisRateLimiter.clearRateLimit(RATE_LIMIT_CONFIGS.api, mockReq);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("getRateLimitConfig", () => {
    it("should return auth config for auth endpoints", () => {
      const config = getRateLimitConfig("/api/auth/signin/google");
      expect(config).toEqual(RATE_LIMIT_CONFIGS.auth);
    });

    it("should return onboarding config for onboarding endpoints", () => {
      const config = getRateLimitConfig("/api/onboarding/public/submit");
      expect(config).toEqual(RATE_LIMIT_CONFIGS.onboarding);
    });

    it("should return AI config for AI endpoints", () => {
      const config = getRateLimitConfig("/api/ai/insights");
      expect(config).toEqual(RATE_LIMIT_CONFIGS.ai);
    });

    it("should return upload config for upload endpoints", () => {
      const config = getRateLimitConfig("/api/upload/photo");
      expect(config).toEqual(RATE_LIMIT_CONFIGS.upload);
    });

    it("should return default API config for other endpoints", () => {
      const config = getRateLimitConfig("/api/contacts");
      expect(config).toEqual(RATE_LIMIT_CONFIGS.api);
    });
  });

  describe("checkRateLimit", () => {
    it("should allow requests within limit", async () => {
      const result = await redisRateLimiter.checkRateLimit(RATE_LIMIT_CONFIGS.api, mockReq);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it("should reject requests over limit", async () => {
      const config = {
        ...RATE_LIMIT_CONFIGS.api,
        maxRequests: 1, // Very low limit for testing
      };

      // First request should be allowed
      const result1 = await redisRateLimiter.checkRateLimit(config, mockReq);
      expect(result1.allowed).toBe(true);

      // Second request should be rejected
      const result2 = await redisRateLimiter.checkRateLimit(config, mockReq);
      expect(result2.allowed).toBe(false);
      expect(result2.retryAfter).toBeDefined();
    });

    it("should handle different user IDs separately", async () => {
      const config = {
        ...RATE_LIMIT_CONFIGS.api,
        maxRequests: 1,
      };

      const req1 = { ...mockReq, userId: "user1" };
      const req2 = { ...mockReq, userId: "user2" };

      // Both users should be allowed their first request
      const result1 = await redisRateLimiter.checkRateLimit(config, req1);
      const result2 = await redisRateLimiter.checkRateLimit(config, req2);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it("should handle different IPs separately", async () => {
      const config = {
        ...RATE_LIMIT_CONFIGS.api,
        maxRequests: 1,
      };

      const req1 = { ...mockReq, ip: "192.168.1.1" };
      const req2 = { ...mockReq, ip: "192.168.1.2" };

      // Both IPs should be allowed their first request
      const result1 = await redisRateLimiter.checkRateLimit(config, req1);
      const result2 = await redisRateLimiter.checkRateLimit(config, req2);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });

  describe("getRateLimitInfo", () => {
    it("should return correct remaining count", async () => {
      const config = {
        ...RATE_LIMIT_CONFIGS.api,
        maxRequests: 5,
      };

      // Make a few requests
      await redisRateLimiter.checkRateLimit(config, mockReq);
      await redisRateLimiter.checkRateLimit(config, mockReq);

      const info = await redisRateLimiter.getRateLimitInfo(config, mockReq);
      expect(info.remaining).toBeLessThanOrEqual(3); // 5 - 2 = 3
      expect(info.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe("Rate limit configurations", () => {
    it("should have appropriate limits for different endpoint types", () => {
      expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBeLessThan(RATE_LIMIT_CONFIGS.api.maxRequests);
      expect(RATE_LIMIT_CONFIGS.onboarding.maxRequests).toBeLessThan(
        RATE_LIMIT_CONFIGS.api.maxRequests,
      );
      expect(RATE_LIMIT_CONFIGS.ai.maxRequests).toBeLessThan(RATE_LIMIT_CONFIGS.api.maxRequests);
      expect(RATE_LIMIT_CONFIGS.upload.maxRequests).toBeLessThan(
        RATE_LIMIT_CONFIGS.api.maxRequests,
      );
    });

    it("should have appropriate time windows", () => {
      expect(RATE_LIMIT_CONFIGS.auth.windowMs).toBeGreaterThan(RATE_LIMIT_CONFIGS.api.windowMs);
      expect(RATE_LIMIT_CONFIGS.onboarding.windowMs).toBeGreaterThan(
        RATE_LIMIT_CONFIGS.api.windowMs,
      );
    });
  });
});

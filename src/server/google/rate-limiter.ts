// Gmail API Rate Limiter with Adaptive Backoff and Quota Management
// Addresses the critical Gmail API rate limiting issues causing sync failures

import { logger } from "@/lib/observability";

interface RateLimitConfig {
  gmailReadRequestsPerUser: number;
  gmailSendRequestsPerUser: number;
  gmailMetadataRequestsPerUser: number;
  calendarRequestsPerUser: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
  maxConsecutiveFailures: number;
  circuitBreakerTimeoutMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  gmailReadRequestsPerUser: 200, // Conservative limit (80% of quota)
  gmailSendRequestsPerUser: 200, // Conservative limit
  gmailMetadataRequestsPerUser: 800, // Conservative limit (80% of quota)
  calendarRequestsPerUser: 480, // Conservative limit (80% of quota)

  initialBackoffMs: 1000, // Start with 1 second
  maxBackoffMs: 60000, // Max 60 seconds
  backoffMultiplier: 2, // Double each time
  jitterFactor: 0.1, // Add 10% random jitter

  maxConsecutiveFailures: 5, // Circuit breaker
  circuitBreakerTimeoutMs: 300000, // 5 minutes
};

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per second
}

interface RateLimitState {
  buckets: Map<string, TokenBucket>; // key: userId:service
  backoffState: Map<string, BackoffState>; // key: userId:service
  circuitBreakers: Map<string, CircuitBreakerState>; // key: userId:service
}

interface BackoffState {
  consecutiveFailures: number;
  currentBackoffMs: number;
  nextAllowedRequest: number;
}

interface CircuitBreakerState {
  state: "closed" | "open" | "half-open";
  failures: number;
  lastFailure: number;
  nextAttempt: number;
}

class GoogleApiRateLimiter {
  private readonly config: RateLimitConfig;
  private readonly state: RateLimitState;
  private maintenanceInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      buckets: new Map(),
      backoffState: new Map(),
      circuitBreakers: new Map(),
    };

    this.startMaintenance();
  }

  /**
   * Check if API request is allowed and consume token if so
   */
  async checkAndConsumeQuota(
    userId: string,
    service: "gmail_read" | "gmail_send" | "gmail_metadata" | "calendar",
    requestCount: number = 1,
  ): Promise<{ allowed: boolean; waitMs?: number; reason?: string }> {
    const bucketKey = `${userId}:${service}`;

    // Check circuit breaker first
    const circuitResult = this.checkCircuitBreaker(bucketKey);
    if (!circuitResult.allowed) {
      return circuitResult;
    }

    // Check backoff state
    const backoffResult = this.checkBackoff(bucketKey);
    if (!backoffResult.allowed) {
      return backoffResult;
    }

    // Check token bucket
    const bucket = this.getOrCreateBucket(bucketKey, service);
    this.refillBucket(bucket);

    if (bucket.tokens >= requestCount) {
      bucket.tokens -= requestCount;

      // Reset backoff on successful request
      this.resetBackoff(bucketKey);

      await logger.debug("API request allowed", {
        operation: "rate_limit",
        additionalData: {
          op: "rate_limiter.request_allowed",
          userId,
          service,
          requestCount,
          remainingTokens: bucket.tokens,
        },
      });

      return { allowed: true };
    } else {
      const refillTimeMs = ((requestCount - bucket.tokens) / bucket.refillRate) * 1000;

      await logger.warn("API quota exceeded", {
        operation: "rate_limit",
        additionalData: {
          op: "rate_limiter.quota_exceeded",
          userId,
          service,
          requestCount,
          availableTokens: bucket.tokens,
          estimatedWaitMs: refillTimeMs,
        },
      });

      return {
        allowed: false,
        waitMs: Math.ceil(refillTimeMs),
        reason: "quota_exceeded",
      };
    }
  }

  /**
   * Record API failure and update backoff state
   */
  async recordFailure(
    userId: string,
    service: "gmail_read" | "gmail_send" | "gmail_metadata" | "calendar",
    error: { status?: number; message?: string },
  ): Promise<{ backoffMs: number; circuitBreakerTripped: boolean }> {
    const bucketKey = `${userId}:${service}`;

    // Update backoff state
    const backoff = this.getOrCreateBackoffState(bucketKey);
    backoff.consecutiveFailures++;

    // Calculate exponential backoff with jitter
    backoff.currentBackoffMs = Math.min(
      this.config.initialBackoffMs *
        Math.pow(this.config.backoffMultiplier, backoff.consecutiveFailures - 1),
      this.config.maxBackoffMs,
    );

    // Add jitter to prevent thundering herd
    const jitter = backoff.currentBackoffMs * this.config.jitterFactor * Math.random();
    backoff.currentBackoffMs += jitter;

    backoff.nextAllowedRequest = Date.now() + backoff.currentBackoffMs;

    // Check if circuit breaker should trip
    let circuitBreakerTripped = false;
    if (backoff.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      circuitBreakerTripped = await this.tripCircuitBreaker(bucketKey);
    }

    // Special handling for different error types
    let multiplier = 1;
    if (error.status === 429) {
      multiplier = 2; // Double backoff for rate limit errors
    } else if (error.status === 403) {
      multiplier = 3; // Triple backoff for quota exceeded
    } else if (error.status && error.status >= 500) {
      multiplier = 1.5; // Moderate backoff for server errors
    }

    backoff.currentBackoffMs *= multiplier;

    await logger.warn("API failure recorded with backoff", {
      operation: "rate_limit",
      additionalData: {
        op: "rate_limiter.failure_recorded",
        userId,
        service,
        consecutiveFailures: backoff.consecutiveFailures,
        backoffMs: backoff.currentBackoffMs,
        circuitBreakerTripped,
        errorStatus: error.status,
        errorMessage: error.message,
      },
    });

    return {
      backoffMs: backoff.currentBackoffMs,
      circuitBreakerTripped,
    };
  }

  /**
   * Record successful API request
   */
  async recordSuccess(
    userId: string,
    service: "gmail_read" | "gmail_send" | "gmail_metadata" | "calendar",
  ): Promise<void> {
    const bucketKey = `${userId}:${service}`;

    this.resetBackoff(bucketKey);
    await this.resetCircuitBreaker(bucketKey);

    await logger.debug("API success recorded", {
      operation: "rate_limit",
      additionalData: {
        op: "rate_limiter.success_recorded",
        userId,
        service,
      },
    });
  }

  /**
   * Get current rate limit status for debugging
   */
  getStatus(
    userId: string,
    service?: string,
  ): {
    buckets: Array<{ service: string; tokens: number; capacity: number }>;
    backoffs: Array<{ service: string; failures: number; nextAllowedMs: number }>;
    circuitBreakers: Array<{ service: string; state: string; failures: number }>;
  } {
    const buckets: Array<{ service: string; tokens: number; capacity: number }> = [];
    const backoffs: Array<{ service: string; failures: number; nextAllowedMs: number }> = [];
    const circuitBreakers: Array<{ service: string; state: string; failures: number }> = [];

    for (const [key, bucket] of this.state.buckets.entries()) {
      if (key.startsWith(userId)) {
        const serviceName = key.split(":")[1] ?? "unknown";
        if (!service || serviceName === service) {
          this.refillBucket(bucket);
          buckets.push({
            service: serviceName,
            tokens: Math.floor(bucket.tokens),
            capacity: bucket.capacity,
          });
        }
      }
    }

    for (const [key, backoff] of this.state.backoffState.entries()) {
      if (key.startsWith(userId)) {
        const serviceName = key.split(":")[1] ?? "unknown";
        if (!service || serviceName === service) {
          backoffs.push({
            service: serviceName,
            failures: backoff.consecutiveFailures,
            nextAllowedMs: Math.max(0, backoff.nextAllowedRequest - Date.now()),
          });
        }
      }
    }

    for (const [key, breaker] of this.state.circuitBreakers.entries()) {
      if (key.startsWith(userId)) {
        const serviceName = key.split(":")[1] ?? "unknown";
        if (!service || serviceName === service) {
          circuitBreakers.push({
            service: serviceName,
            state: breaker.state,
            failures: breaker.failures,
          });
        }
      }
    }

    return { buckets, backoffs, circuitBreakers };
  }

  // Private helper methods

  private getOrCreateBucket(bucketKey: string, service: string): TokenBucket {
    if (!this.state.buckets.has(bucketKey)) {
      const capacity = this.getServiceCapacity(service);
      const bucket: TokenBucket = {
        tokens: capacity,
        lastRefill: Date.now(),
        capacity,
        refillRate: capacity / 100, // Refill over 100 seconds per Google quota
      };
      this.state.buckets.set(bucketKey, bucket);
    }

    const bucket = this.state.buckets.get(bucketKey);
    if (!bucket) {
      throw new Error(`Failed to retrieve bucket after creation: ${bucketKey}`);
    }

    return bucket;
  }

  private getServiceCapacity(service: string): number {
    switch (service) {
      case "gmail_read":
        return this.config.gmailReadRequestsPerUser;
      case "gmail_send":
        return this.config.gmailSendRequestsPerUser;
      case "gmail_metadata":
        return this.config.gmailMetadataRequestsPerUser;
      case "calendar":
        return this.config.calendarRequestsPerUser;
      default:
        return 100; // Conservative default
    }
  }

  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / 1000) * bucket.refillRate;

    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  private checkCircuitBreaker(bucketKey: string): {
    allowed: boolean;
    waitMs?: number;
    reason?: string;
  } {
    const breaker = this.state.circuitBreakers.get(bucketKey);
    if (!breaker || breaker.state === "closed") {
      return { allowed: true };
    }

    const now = Date.now();

    if (breaker.state === "open") {
      if (now >= breaker.nextAttempt) {
        breaker.state = "half-open";
        return { allowed: true };
      } else {
        return {
          allowed: false,
          waitMs: breaker.nextAttempt - now,
          reason: "circuit_breaker_open",
        };
      }
    }

    // half-open state - allow one request to test
    return { allowed: true };
  }

  private checkBackoff(bucketKey: string): { allowed: boolean; waitMs?: number; reason?: string } {
    const backoff = this.state.backoffState.get(bucketKey);
    if (!backoff) {
      return { allowed: true };
    }

    const now = Date.now();
    if (now < backoff.nextAllowedRequest) {
      return {
        allowed: false,
        waitMs: backoff.nextAllowedRequest - now,
        reason: "backoff_delay",
      };
    }

    return { allowed: true };
  }

  private getOrCreateBackoffState(bucketKey: string): BackoffState {
    if (!this.state.backoffState.has(bucketKey)) {
      const backoff: BackoffState = {
        consecutiveFailures: 0,
        currentBackoffMs: 0,
        nextAllowedRequest: 0,
      };
      this.state.backoffState.set(bucketKey, backoff);
    }

    const backoffState = this.state.backoffState.get(bucketKey);
    if (!backoffState) {
      throw new Error(`Failed to retrieve backoff state after creation: ${bucketKey}`);
    }

    return backoffState;
  }

  private resetBackoff(bucketKey: string): void {
    const backoff = this.state.backoffState.get(bucketKey);
    if (backoff) {
      backoff.consecutiveFailures = 0;
      backoff.currentBackoffMs = 0;
      backoff.nextAllowedRequest = 0;
    }
  }

  private async tripCircuitBreaker(bucketKey: string): Promise<boolean> {
    const now = Date.now();
    const breaker: CircuitBreakerState = {
      state: "open",
      failures: this.state.backoffState.get(bucketKey)?.consecutiveFailures ?? 0,
      lastFailure: now,
      nextAttempt: now + this.config.circuitBreakerTimeoutMs,
    };

    this.state.circuitBreakers.set(bucketKey, breaker);

    await logger.error("Circuit breaker tripped due to consecutive failures", {
      operation: "rate_limit",
      additionalData: {
        op: "rate_limiter.circuit_breaker_tripped",
        bucketKey,
        failures: breaker.failures,
        timeoutMs: this.config.circuitBreakerTimeoutMs,
      },
    });

    return true;
  }

  private async resetCircuitBreaker(bucketKey: string): Promise<void> {
    const breaker = this.state.circuitBreakers.get(bucketKey);
    if (breaker && breaker.state !== "closed") {
      breaker.state = "closed";
      breaker.failures = 0;

      await logger.info("Circuit breaker reset after successful request", {
        operation: "rate_limit",
        additionalData: {
          op: "rate_limiter.circuit_breaker_reset",
          bucketKey,
        },
      });
    }
  }

  private startMaintenance(): void {
    this.maintenanceInterval = setInterval(async () => {
      await this.cleanupExpiredState();
    }, 300000); // Run every 5 minutes
  }

  private async cleanupExpiredState(): Promise<void> {
    const now = Date.now();
    const expiredThreshold = 24 * 60 * 60 * 1000; // 24 hours

    // Cleanup old backoff states
    for (const [key, backoff] of this.state.backoffState.entries()) {
      if (backoff.nextAllowedRequest < now - expiredThreshold) {
        this.state.backoffState.delete(key);
      }
    }

    // Cleanup old circuit breaker states
    for (const [key, breaker] of this.state.circuitBreakers.entries()) {
      if (breaker.lastFailure < now - expiredThreshold && breaker.state === "closed") {
        this.state.circuitBreakers.delete(key);
      }
    }

    await logger.debug("Rate limiter maintenance completed", {
      operation: "rate_limit",
      additionalData: {
        op: "rate_limiter.maintenance",
        bucketsCount: this.state.buckets.size,
        backoffStatesCount: this.state.backoffState.size,
        circuitBreakersCount: this.state.circuitBreakers.size,
      },
    });
  }

  /**
   * Cleanup all state
   */
  destroy(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }

    this.state.buckets.clear();
    this.state.backoffState.clear();
    this.state.circuitBreakers.clear();
  }
}

// Global rate limiter instance
export const googleApiRateLimiter = new GoogleApiRateLimiter();

// Helper function to wrap Google API calls with rate limiting
export async function withRateLimit<T>(
  userId: string,
  service: "gmail_read" | "gmail_send" | "gmail_metadata" | "calendar",
  requestCount: number,
  apiCall: () => Promise<T>,
): Promise<T> {
  // Check quota before making request
  const quotaCheck = await googleApiRateLimiter.checkAndConsumeQuota(userId, service, requestCount);

  if (!quotaCheck.allowed) {
    if (quotaCheck.waitMs && quotaCheck.waitMs < 60000) {
      // Wait for short delays (< 1 minute)
      await logger.info("Waiting for rate limit to reset", {
        operation: "rate_limit",
        additionalData: {
          op: "rate_limiter.waiting",
          userId,
          service,
          waitMs: quotaCheck.waitMs,
          reason: quotaCheck.reason,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, quotaCheck.waitMs));

      // Retry quota check after waiting
      const retryCheck = await googleApiRateLimiter.checkAndConsumeQuota(
        userId,
        service,
        requestCount,
      );
      if (!retryCheck.allowed) {
        throw new Error(`Rate limit exceeded: ${retryCheck.reason}`);
      }
    } else {
      throw new Error(`Rate limit exceeded: ${quotaCheck.reason} (wait: ${quotaCheck.waitMs}ms)`);
    }
  }

  try {
    const result = await apiCall();
    await googleApiRateLimiter.recordSuccess(userId, service);
    return result;
  } catch (error) {
    // Parse Google API error
    const errorStatus =
      error instanceof Error && "status" in error
        ? (error as { status: unknown }).status
        : undefined;
    const apiError: { status?: number; message?: string } = {
      message: error instanceof Error ? error.message : String(error),
    };

    if (typeof errorStatus === "number") {
      apiError.status = errorStatus;
    }

    await googleApiRateLimiter.recordFailure(userId, service, apiError);
    throw error;
  }
}

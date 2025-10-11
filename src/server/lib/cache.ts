// Database Query Result Caching System (Redis-backed)
import { logger } from "@/lib/observability";
import {
  redisGet,
  redisSet,
  redisDel,
  redisScan,
  redisDelMultiple,
  redisIncr,
} from "./redis-client";

interface CacheStats {
  hits: number;
  misses: number;
}

class QueryCache {
  private stats: CacheStats = { hits: 0, misses: 0 };
  private statsMutex = Promise.resolve();
  private readonly STATS_KEYS = {
    hits: "cache:stats:hits",
    misses: "cache:stats:misses",
  } as const;

  constructor() {
    // Initialize stats from Redis on startup
    this.initializeStats();
  }

  /**
   * Initialize stats from Redis or fallback to in-memory
   */
  private async initializeStats(): Promise<void> {
    try {
      const [hits, misses] = await Promise.all([
        redisGet<number>(this.STATS_KEYS.hits),
        redisGet<number>(this.STATS_KEYS.misses),
      ]);

      this.stats = {
        hits: hits ?? 0,
        misses: misses ?? 0,
      };
    } catch (error) {
      console.warn("Failed to initialize cache stats from Redis, using in-memory only:", error);
      this.stats = { hits: 0, misses: 0 };
    }
  }

  /**
   * Get cached value or execute function to populate cache
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300, // 5 minutes default
  ): Promise<T> {
    const redisKey = `cache:${key}`;

    // Check Redis cache
    const cachedData = await redisGet<T>(redisKey);
    if (cachedData !== null) {
      await this.incrementStat("hits");
      logger
        .debug("Cache hit", {
          operation: "cache_get",
          additionalData: { op: "cache.hit", key },
        })
        .catch((error) => {
          console.error("Cache hit logging failed:", error, { key });
        });
      return cachedData;
    }

    // Cache miss - fetch data
    await this.incrementStat("misses");
    logger
      .debug("Cache miss", {
        operation: "cache_get",
        additionalData: { op: "cache.miss", key },
      })
      .catch((error) => {
        console.error("Cache miss logging failed:", error, { key });
      });

    const data = await fetcher();
    await this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Set cache value with TTL
   */
  async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    const redisKey = `cache:${key}`;
    await redisSet(redisKey, data, ttlSeconds);

    logger
      .debug("Data cached", {
        operation: "cache_set",
        additionalData: { op: "cache.set", key, ttl: ttlSeconds },
      })
      .catch(() => {}); // Fire-and-forget logging
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    const redisKey = `cache:${key}`;
    await redisDel(redisKey);
  }

  /**
   * Delete cache entries matching pattern using Redis SCAN
   */
  async deletePattern(pattern: string): Promise<void> {
    const fullPattern = `cache:${pattern}`;
    let cursor = 0;
    let totalDeleted = 0;
    const batchSize = 100; // Process keys in batches to avoid blocking Redis

    try {
      do {
        const { cursor: newCursor, keys } = await redisScan(fullPattern, cursor, batchSize);
        cursor = newCursor;

        if (keys.length > 0) {
          // Delete keys in batches
          const deletedCount = await redisDelMultiple(keys);
          totalDeleted += deletedCount;

          await logger.debug("Deleted cache keys in batch", {
            operation: "cache_invalidate",
            additionalData: {
              op: "cache.delete_pattern",
              pattern: fullPattern,
              batchSize: keys.length,
              deletedInBatch: deletedCount,
              totalDeleted,
            },
          });
        }
      } while (cursor !== 0);

      await logger.info("Pattern deletion completed", {
        operation: "cache_invalidate",
        additionalData: {
          op: "cache.delete_pattern",
          pattern: fullPattern,
          totalDeleted,
        },
      });
    } catch (error) {
      await logger.error("Failed to delete cache pattern", {
        operation: "cache_invalidate",
        additionalData: {
          op: "cache.delete_pattern",
          pattern: fullPattern,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  /**
   * Atomically increment a stat counter in Redis and update in-memory mirror
   */
  private async incrementStat(key: keyof CacheStats): Promise<void> {
    this.statsMutex = this.statsMutex
      .then(async () => {
        try {
          // Increment in Redis atomically
          const newValue = await redisIncr(this.STATS_KEYS[key]);
          // Update in-memory mirror
          this.stats[key] = newValue;
        } catch (error) {
          // Fallback to in-memory only if Redis fails
          console.warn(`Failed to increment ${key} in Redis, using in-memory only:`, error);
          try {
            this.stats[key]++;
          } catch (incrementError) {
            // If even in-memory increment fails, log and continue
            console.error(`Failed to increment ${key} in-memory:`, incrementError);
          }
        }
      })
      .catch((error) => {
        // Handle any errors in the promise chain
        console.error(`Failed to process stat increment for ${key}:`, error);
      });
    await this.statsMutex;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }
}

// Singleton cache instance
export const queryCache = new QueryCache();

// Cache key generators for consistent naming
export const cacheKeys = {
  // User preferences (high cache hit rate expected)
  userIntegrations: (userId: string, provider?: string, service?: string) =>
    `user_integrations:${userId}${provider ? `:${provider}` : ""}${service ? `:${service}` : ""}`,

  // AI quotas and usage (checked frequently)
  aiQuota: (userId: string) => `ai_quota:${userId}`,
  aiUsageToday: (userId: string) => `ai_usage_today:${userId}`,

  // Contact lists (pagination results)
  contactsList: (userId: string, params: string) => `contacts_list:${userId}:${params}`,
  contactsCount: (userId: string, search?: string) =>
    `contacts_count:${userId}${search ? `:${search}` : ""}`,

  // Interaction timelines
  interactionsTimeline: (userId: string, contactId?: string, limit?: number) =>
    `interactions:${userId}${contactId ? `:${contactId}` : ""}:${limit ?? 50}`,

  // Job queue status
  jobsQueued: (userId: string) => `jobs_queued:${userId}`,

  // Sync audit status
  lastSyncStatus: (userId: string, provider: string) => `last_sync:${userId}:${provider}`,
} as const;

// Cache invalidation helpers
export const cacheInvalidation = {
  // Invalidate user-specific caches
  invalidateUser: async (userId: string) => {
    await queryCache.deletePattern(`*:${userId}*`);
    logger
      .info("User cache invalidated", {
        operation: "cache_invalidate",
        additionalData: { op: "cache.invalidate_user", userId },
      })
      .catch((error) => {
        logger
          .error("Failed to log user cache invalidation", {
            operation: "cache_invalidate",
            additionalData: {
              op: "cache.invalidate_user",
              userId,
              error: error instanceof Error ? error.message : String(error),
            },
          })
          .catch(() => {}); // Prevent cascading errors
      });
  },

  // Invalidate contact-related caches
  invalidateContacts: async (userId: string) => {
    await queryCache.deletePattern(`contacts*:${userId}*`);
    await queryCache.deletePattern(`interactions:${userId}*`);
    logger
      .info("Contact caches invalidated", {
        operation: "cache_invalidate",
        additionalData: { op: "cache.invalidate_contacts", userId },
      })
      .catch((error) => {
        logger
          .error("Failed to log contact cache invalidation", {
            operation: "cache_invalidate",
            additionalData: {
              op: "cache.invalidate_contacts",
              userId,
              error: error instanceof Error ? error.message : String(error),
            },
          })
          .catch(() => {}); // Prevent cascading errors
      });
  },

  // Invalidate sync-related caches
  invalidateSync: async (userId: string, provider?: string) => {
    if (provider) {
      await queryCache.delete(cacheKeys.lastSyncStatus(userId, provider));
    } else {
      await queryCache.deletePattern(`last_sync:${userId}*`);
    }
    logger
      .info("Sync caches invalidated", {
        operation: "cache_invalidate",
        additionalData: { op: "cache.invalidate_sync", userId, provider },
      })
      .catch((error) => {
        logger
          .error("Failed to log sync cache invalidation", {
            operation: "cache_invalidate",
            additionalData: {
              op: "cache.invalidate_sync",
              userId,
              provider,
              error: error instanceof Error ? error.message : String(error),
            },
          })
          .catch(() => {}); // Prevent cascading errors
      });
  },

  // Invalidate AI-related caches
  invalidateAI: async (userId: string) => {
    await queryCache.delete(cacheKeys.aiQuota(userId));
    await queryCache.delete(cacheKeys.aiUsageToday(userId));
    logger
      .info("AI caches invalidated", {
        operation: "cache_invalidate",
        additionalData: { op: "cache.invalidate_ai", userId },
      })
      .catch((error) => {
        logger
          .error("Failed to log AI cache invalidation", {
            operation: "cache_invalidate",
            additionalData: {
              op: "cache.invalidate_ai",
              userId,
              error: error instanceof Error ? error.message : String(error),
            },
          })
          .catch(() => {}); // Prevent cascading errors
      });
  },
} as const;

// Cache warming functions for critical paths
export const cacheWarming = {
  // Warm user preferences on login
  warmUserPreferences: async (userId: string) => {
    try {
      const { getDb } = await import("@/server/db/client");
      const { userIntegrations } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      const db = await getDb();

      // Warm user integrations
      await queryCache.get(
        cacheKeys.userIntegrations(userId),
        () => db.select().from(userIntegrations).where(eq(userIntegrations.userId, userId)),
        600, // 10 minutes TTL
      );

      await logger.info("User preferences warmed", {
        operation: "cache_set",
        additionalData: { op: "cache.warm_user", userId },
      });
    } catch (error) {
      await logger.warn(
        "Failed to warm user cache",
        {
          operation: "cache_set",
          additionalData: {
            op: "cache.warm_error",
            userId,
            error: error instanceof Error ? error.message : String(error),
          },
        },
        error instanceof Error ? error : undefined,
      );
    }
  },
} as const;

// Export cache metrics for monitoring
export const getCacheMetrics = (): CacheStats & { hitRate: number } => queryCache.getStats();

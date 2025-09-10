// Database Query Result Caching System
// Implements Redis-like in-memory caching for frequently accessed data
import { logger } from "@/lib/observability";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  hitCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, totalSize: 0 };
  private maxSize = 1000; // Maximum cache entries
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get cached value or execute function to populate cache
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300, // 5 minutes default
  ): Promise<T> {
    const now = Date.now();
    const entry = this.cache.get(key);

    // Cache hit
    if (entry && entry.expiresAt > now) {
      entry.hitCount++;
      entry.lastAccessed = now;
      this.stats.hits++;

      await logger.debug("Cache hit", {
        operation: "cache_get",
        additionalData: {
          op: "cache.hit",
          key,
          hitCount: entry.hitCount,
          age: Math.round((now - (entry.expiresAt - ttlSeconds * 1000)) / 1000),
        },
      });

      // Type assertion is safe here because we control what goes into the cache
      return entry.data as T;
    }

    // Cache miss - fetch data
    this.stats.misses++;
    await logger.debug("Cache miss", {
      operation: "cache_get",
      additionalData: {
        op: "cache.miss",
        key,
        expired: entry ? entry.expiresAt <= now : false,
      },
    });

    try {
      const data = await fetcher();
      await this.set(key, data, ttlSeconds);
      return data;
    } catch (error) {
      // If we have expired data, return it as fallback
      if (entry) {
        await logger.warn(
          "Using expired cache data as fallback",
          {
            operation: "cache_get",
            additionalData: {
              op: "cache.fallback",
              key,
              error: error instanceof Error ? error.message : String(error),
            },
          },
          error instanceof Error ? error : undefined,
        );

        // Type assertion is safe here because we control what goes into the cache
        return entry.data as T;
      }
      throw error;
    }
  }

  /**
   * Set cache value with TTL
   */
  async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      await this.evictLRU();
    }

    this.cache.set(key, {
      data,
      expiresAt,
      hitCount: 0,
      lastAccessed: now,
    });

    this.stats.totalSize = this.cache.size;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.stats.totalSize = this.cache.size;
    return deleted;
  }

  /**
   * Delete cache entries matching pattern
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    this.stats.totalSize = this.cache.size;
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, totalSize: 0 };
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

  /**
   * Cleanup expired entries
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.totalSize = this.cache.size;
      await logger.info("Cache cleanup completed", {
        operation: "cache_invalidate",
        additionalData: {
          op: "cache.cleanup",
          cleaned,
          remaining: this.cache.size,
        },
      });
    }
  }

  /**
   * Evict least recently used entry
   */
  private async evictLRU(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;

      await logger.debug("Cache entry evicted", {
        operation: "cache_invalidate",
        additionalData: {
          op: "cache.evict",
          key: oldestKey,
          age: Math.round((Date.now() - oldestTime) / 1000),
        },
      });
    }
  }

  /**
   * Graceful shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Singleton cache instance
export const queryCache = new QueryCache();

// Cache key generators for consistent naming
export const cacheKeys = {
  // User preferences (high cache hit rate expected)
  userSyncPrefs: (userId: string) => `user_sync_prefs:${userId}`,
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
  invalidateUser: (userId: string) => {
    queryCache.deletePattern(`*:${userId}*`);
    void logger
      .info("User cache invalidated", {
        operation: "cache_invalidate",
        additionalData: { op: "cache.invalidate_user", userId },
      })
      .catch(console.error);
  },

  // Invalidate contact-related caches
  invalidateContacts: (userId: string) => {
    queryCache.deletePattern(`contacts*:${userId}*`);
    queryCache.deletePattern(`interactions:${userId}*`);
    void logger
      .info("Contact caches invalidated", {
        operation: "cache_invalidate",
        additionalData: { op: "cache.invalidate_contacts", userId },
      })
      .catch(console.error);
  },

  // Invalidate sync-related caches
  invalidateSync: (userId: string, provider?: string) => {
    if (provider) {
      queryCache.delete(cacheKeys.lastSyncStatus(userId, provider));
    } else {
      queryCache.deletePattern(`last_sync:${userId}*`);
    }
    queryCache.delete(cacheKeys.userSyncPrefs(userId));
    void logger
      .info("Sync caches invalidated", {
        operation: "cache_invalidate",
        additionalData: { op: "cache.invalidate_sync", userId, provider },
      })
      .catch(console.error);
  },

  // Invalidate AI-related caches
  invalidateAI: (userId: string) => {
    queryCache.delete(cacheKeys.aiQuota(userId));
    queryCache.delete(cacheKeys.aiUsageToday(userId));
    void logger
      .info("AI caches invalidated", {
        operation: "cache_invalidate",
        additionalData: { op: "cache.invalidate_ai", userId },
      })
      .catch(console.error);
  },
} as const;

// Cache warming functions for critical paths
export const cacheWarming = {
  // Warm user preferences on login
  warmUserPreferences: async (userId: string) => {
    try {
      const { getDb } = await import("@/server/db/client");
      const { userSyncPrefs, userIntegrations } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      const db = await getDb();

      // Warm sync preferences
      await queryCache.get(
        cacheKeys.userSyncPrefs(userId),
        () => db.select().from(userSyncPrefs).where(eq(userSyncPrefs.userId, userId)).limit(1),
        900, // 15 minutes TTL
      );

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

// Graceful shutdown hook
process.on("SIGTERM", () => queryCache.destroy());
process.on("SIGINT", () => queryCache.destroy());

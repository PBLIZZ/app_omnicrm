// Enhanced Database Client with Memory-Aware Connection Management
// Optimizes connection pooling based on memory usage and operation requirements

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig, type PoolClient } from "pg";
import { log } from "@/server/log";

// Enhanced pool configuration with memory awareness
export interface MemoryAwarePoolConfig extends PoolConfig {
  memoryBasedScaling: boolean;
  lowMemoryMaxConnections: number;
  highMemoryMaxConnections: number;
  memoryThresholdMB: number;
  connectionHealthChecks: boolean;
  idleConnectionCleanup: boolean;
  priorityConnectionReservation: boolean;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  memoryUsagePerConnectionMB: number;
  poolEfficiency: number;
  averageConnectionLifetimeMs: number;
}

export interface ConnectionPriority {
  level: "low" | "normal" | "high" | "critical";
  operationType: string;
  estimatedDurationMs: number;
  memoryRequirementMB: number;
}

let enhancedDbInstance: NodePgDatabase | null = null;
let enhancedDbInitPromise: Promise<NodePgDatabase> | null = null;
let enhancedPoolInstance: EnhancedPool | null = null;

// Connection lifecycle tracking
const connectionMetrics = {
  connectionsCreated: 0,
  connectionsDestroyed: 0,
  totalConnectionTime: 0,
  memorySnapshots: [] as Array<{ timestamp: number; memoryMB: number; connections: number }>,
};

/**
 * Enhanced Pool with memory-aware connection management
 */
class EnhancedPool {
  private pool: Pool;
  private config: MemoryAwarePoolConfig;
  private reservedConnections = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: MemoryAwarePoolConfig) {
    this.config = config;
    this.pool = new Pool(this.getAdaptivePoolConfig());

    this.setupEventHandlers();
    this.startHealthChecks();
    this.startCleanupRoutines();
  }

  /**
   * Get database connection with priority and memory awareness
   */
  async connect(
    priority: ConnectionPriority = {
      level: "normal",
      operationType: "general",
      estimatedDurationMs: 5000,
      memoryRequirementMB: 10,
    },
  ): Promise<PoolClient> {
    // Check if we should adjust pool size based on memory
    await this.adjustPoolForMemoryPressure();

    // Reserve connection for high priority operations
    if (priority.level === "high" || priority.level === "critical") {
      await this.reserveConnectionIfNeeded(priority);
    }

    const startTime = Date.now();

    try {
      const client = await this.pool.connect();

      // Track connection metrics
      this.trackConnectionAcquisition(priority, Date.now() - startTime);

      return client;
    } catch (error) {
      log.error(
        {
          op: "enhanced_db.connection_failed",
          priority: priority.level,
          operationType: priority.operationType,
          error: error instanceof Error ? error.message : String(error),
          poolStats: this.getConnectionMetrics(),
        },
        "Failed to acquire database connection",
      );

      throw error;
    }
  }

  /**
   * Adjust pool configuration based on current memory pressure
   */
  private async adjustPoolForMemoryPressure(): Promise<void> {
    if (!this.config.memoryBasedScaling) return;

    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.heapUsed / (1024 * 1024);
    const currentConfig = this.pool.options;

    let targetMaxConnections = this.config.max ?? 10;

    if (memoryMB > this.config.memoryThresholdMB) {
      // High memory pressure - reduce connections
      targetMaxConnections = this.config.lowMemoryMaxConnections;

      log.debug(
        {
          op: "enhanced_db.memory_pressure_adjustment",
          memoryUsageMB: Math.round(memoryMB),
          thresholdMB: this.config.memoryThresholdMB,
          newMaxConnections: targetMaxConnections,
        },
        "Reducing connection pool size due to memory pressure",
      );
    } else if (memoryMB < this.config.memoryThresholdMB * 0.7) {
      // Low memory pressure - allow more connections
      targetMaxConnections = this.config.highMemoryMaxConnections;
    }

    // Apply configuration change if needed
    if (currentConfig.max !== targetMaxConnections) {
      await this.updatePoolConfig({ max: targetMaxConnections });
    }
  }

  /**
   * Reserve connection for high priority operations
   */
  private async reserveConnectionIfNeeded(priority: ConnectionPriority): Promise<void> {
    if (!this.config.priorityConnectionReservation) return;

    const metrics = this.getConnectionMetrics();
    const availableConnections = metrics.totalConnections - metrics.activeConnections;

    // Reserve connections for critical operations
    if (priority.level === "critical" && availableConnections <= 2) {
      this.reservedConnections = Math.min(2, metrics.totalConnections);

      log.info(
        {
          op: "enhanced_db.connection_reserved",
          priority: priority.level,
          reservedConnections: this.reservedConnections,
          operationType: priority.operationType,
        },
        "Reserved connections for critical operation",
      );
    }
  }

  /**
   * Update pool configuration dynamically
   */
  private async updatePoolConfig(newConfig: Partial<PoolConfig>): Promise<void> {
    try {
      // Create new pool with updated configuration
      const updatedConfig = { ...this.pool.options, ...newConfig };
      const newPool = new Pool(updatedConfig);

      // Gradually migrate to new pool
      const oldPool = this.pool;
      this.pool = newPool;

      // Gracefully close old pool after a delay
      setTimeout(async () => {
        try {
          await oldPool.end();
          log.debug(
            {
              op: "enhanced_db.pool_updated",
              newConfig,
            },
            "Pool configuration updated successfully",
          );
        } catch (error) {
          log.warn(
            {
              op: "enhanced_db.old_pool_cleanup_failed",
              error: error instanceof Error ? error.message : String(error),
            },
            "Failed to cleanup old pool",
          );
        }
      }, 5000);
    } catch (error) {
      log.error(
        {
          op: "enhanced_db.pool_update_failed",
          newConfig,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to update pool configuration",
      );
    }
  }

  /**
   * Setup event handlers for monitoring
   */
  private setupEventHandlers(): void {
    this.pool.on("connect", () => {
      connectionMetrics.connectionsCreated++;
      this.trackMemorySnapshot();

      log.debug(
        {
          op: "enhanced_db.connection_created",
          totalCreated: connectionMetrics.connectionsCreated,
        },
        "Database connection created",
      );
    });

    this.pool.on("remove", () => {
      connectionMetrics.connectionsDestroyed++;

      log.debug(
        {
          op: "enhanced_db.connection_destroyed",
          totalDestroyed: connectionMetrics.connectionsDestroyed,
        },
        "Database connection destroyed",
      );
    });

    this.pool.on("error", (error) => {
      log.error(
        {
          op: "enhanced_db.pool_error",
          error: error.message,
          poolStats: this.getConnectionMetrics(),
        },
        "Database pool error",
      );
    });
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (!this.config.connectionHealthChecks) return;

    this.healthCheckInterval = setInterval(async () => {
      try {
        const client = await this.pool.connect();
        await client.query("SELECT 1");
        client.release();

        log.debug(
          {
            op: "enhanced_db.health_check_passed",
            poolStats: this.getConnectionMetrics(),
          },
          "Database health check passed",
        );
      } catch (error) {
        log.warn(
          {
            op: "enhanced_db.health_check_failed",
            error: error instanceof Error ? error.message : String(error),
          },
          "Database health check failed",
        );
      }
    }, 60000); // Every minute
  }

  /**
   * Start cleanup routines
   */
  private startCleanupRoutines(): void {
    if (!this.config.idleConnectionCleanup) return;

    this.cleanupInterval = setInterval(() => {
      void this.cleanupIdleConnections();
      this.trimMetricsHistory();
      void this.performPoolMaintenance();
    }, 120000); // Every 2 minutes - more frequent cleanup
  }

  /**
   * Perform comprehensive pool maintenance
   */
  private async performPoolMaintenance(): Promise<void> {
    const metrics = this.getConnectionMetrics();
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.heapUsed / (1024 * 1024);

    // Log pool health
    if (metrics.waitingClients > 3) {
      log.warn(
        {
          op: "enhanced_db.pool_pressure",
          waitingClients: metrics.waitingClients,
          activeConnections: metrics.activeConnections,
          memoryUsageMB: Math.round(memoryMB),
        },
        "High pool pressure detected",
      );
    }

    // Detect connection leaks
    if (metrics.activeConnections > metrics.totalConnections * 0.8) {
      log.error(
        {
          op: "enhanced_db.potential_leak",
          activeConnections: metrics.activeConnections,
          totalConnections: metrics.totalConnections,
          poolEfficiency: metrics.poolEfficiency,
        },
        "Potential connection leak detected",
      );
    }
  }

  /**
   * Cleanup idle connections based on memory pressure
   */
  private async cleanupIdleConnections(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.heapUsed / (1024 * 1024);
    const metrics = this.getConnectionMetrics();

    if (memoryMB > this.config.memoryThresholdMB && metrics.idleConnections > 3) {
      log.info(
        {
          op: "enhanced_db.idle_cleanup",
          memoryUsageMB: Math.round(memoryMB),
          idleConnections: metrics.idleConnections,
        },
        "Cleaning up idle connections due to memory pressure",
      );

      // Graceful connection cleanup - don't restart entire pool
      try {
        // Just reduce the max pool size temporarily
        await this.updatePoolConfig({
          max: Math.max(3, this.config.lowMemoryMaxConnections),
        });

        log.info(
          {
            op: "enhanced_db.pool_size_reduced",
            newMaxConnections: this.config.lowMemoryMaxConnections,
          },
          "Reduced pool size due to memory pressure",
        );
      } catch (error) {
        log.warn(
          {
            op: "enhanced_db.cleanup_failed",
            error: error instanceof Error ? error.message : String(error),
          },
          "Failed to cleanup idle connections",
        );
      }
    }
  }

  /**
   * Track memory snapshots for analysis
   */
  private trackMemorySnapshot(): void {
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.heapUsed / (1024 * 1024);
    const metrics = this.getConnectionMetrics();

    connectionMetrics.memorySnapshots.push({
      timestamp: Date.now(),
      memoryMB: Math.round(memoryMB),
      connections: metrics.totalConnections,
    });

    // Keep only last 100 snapshots
    if (connectionMetrics.memorySnapshots.length > 100) {
      connectionMetrics.memorySnapshots.shift();
    }
  }

  /**
   * Track connection acquisition metrics
   */
  private trackConnectionAcquisition(
    priority: ConnectionPriority,
    acquisitionTimeMs: number,
  ): void {
    connectionMetrics.totalConnectionTime += acquisitionTimeMs;

    if (acquisitionTimeMs > 1000) {
      log.warn(
        {
          op: "enhanced_db.slow_connection_acquisition",
          acquisitionTimeMs,
          priority: priority.level,
          operationType: priority.operationType,
        },
        "Slow database connection acquisition",
      );
    }
  }

  /**
   * Trim metrics history to prevent memory leaks
   */
  private trimMetricsHistory(): void {
    const maxHistory = 1000;
    if (connectionMetrics.memorySnapshots.length > maxHistory) {
      connectionMetrics.memorySnapshots = connectionMetrics.memorySnapshots.slice(-maxHistory);
    }
  }

  /**
   * Get adaptive pool configuration based on current conditions
   */
  private getAdaptivePoolConfig(): PoolConfig {
    // Simple heuristic based on current memory pressure
    const memoryUsageHigh = process.memoryUsage().heapUsed > 200 * 1024 * 1024; // 200MB threshold

    return {
      ...this.config,
      max: memoryUsageHigh
        ? this.config.lowMemoryMaxConnections
        : this.config.highMemoryMaxConnections,
    };
  }

  /**
   * Get the underlying pool instance
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Get current connection metrics
   */
  getConnectionMetrics(): ConnectionMetrics {
    const poolSize = this.pool.totalCount;
    const idleCount = this.pool.idleCount;
    const waitingCount = this.pool.waitingCount;

    const memoryPerConnection =
      connectionMetrics.memorySnapshots.length > 0
        ? connectionMetrics.memorySnapshots[connectionMetrics.memorySnapshots.length - 1]!
            .memoryMB / Math.max(1, poolSize)
        : 0;

    const poolEfficiency = poolSize > 0 ? (poolSize - idleCount) / poolSize : 0;

    const avgConnectionLifetime =
      connectionMetrics.connectionsCreated > 0
        ? connectionMetrics.totalConnectionTime / connectionMetrics.connectionsCreated
        : 0;

    return {
      totalConnections: poolSize,
      activeConnections: poolSize - idleCount,
      idleConnections: idleCount,
      waitingClients: waitingCount,
      memoryUsagePerConnectionMB: Math.round(memoryPerConnection * 100) / 100,
      poolEfficiency: Math.round(poolEfficiency * 100) / 100,
      averageConnectionLifetimeMs: Math.round(avgConnectionLifetime),
    };
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    await this.pool.end();
  }
}

/**
 * Enhanced database connection factory
 */
export async function getEnhancedDb(priority?: ConnectionPriority): Promise<NodePgDatabase> {
  if (enhancedDbInstance && !priority) return enhancedDbInstance;
  if (enhancedDbInitPromise) return enhancedDbInitPromise;

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  enhancedDbInitPromise = (async (): Promise<NodePgDatabase> => {
    const poolConfig: MemoryAwarePoolConfig = {
      connectionString: databaseUrl,
      max: 15,
      min: 3,
      idleTimeoutMillis: 20000, // Reduced idle timeout for faster cleanup
      connectionTimeoutMillis: 8000, // Faster connection timeout
      // acquireTimeoutMillis: 12000,   // Max wait time for connection - not a standard pg config
      maxUses: 10000, // Higher max uses before rotation
      allowExitOnIdle: false,
      keepAlive: true, // Enable TCP keep-alive
      keepAliveInitialDelayMillis: 10000,
      statement_timeout: 25000, // 25s statement timeout
      query_timeout: 20000, // 20s query timeout

      // Enhanced memory-aware settings
      memoryBasedScaling: true,
      lowMemoryMaxConnections: 6, // Increased minimum under pressure
      highMemoryMaxConnections: 20, // Higher max when memory available
      memoryThresholdMB: 85, // Slightly higher threshold
      connectionHealthChecks: true,
      idleConnectionCleanup: true,
      priorityConnectionReservation: true,
    };

    enhancedPoolInstance = new EnhancedPool(poolConfig);

    // Test the pool connection
    const client = await enhancedPoolInstance.connect({
      level: "high",
      operationType: "initialization",
      estimatedDurationMs: 2000,
      memoryRequirementMB: 5,
    });
    client.release();

    // Import drizzle
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const instance = drizzle(enhancedPoolInstance.getPool()) as NodePgDatabase;

    enhancedDbInstance = instance;
    return instance;
  })();

  try {
    return await enhancedDbInitPromise;
  } finally {
    enhancedDbInitPromise = null;
  }
}

/**
 * Get connection with specific priority
 */
export async function getEnhancedConnection(priority: ConnectionPriority): Promise<PoolClient> {
  if (!enhancedPoolInstance) {
    await getEnhancedDb(priority);
  }

  return enhancedPoolInstance!.connect(priority);
}

/**
 * Get enhanced pool metrics
 */
export function getEnhancedPoolMetrics(): ConnectionMetrics | null {
  return enhancedPoolInstance?.getConnectionMetrics() ?? null;
}

/**
 * Cleanup enhanced database resources
 */
export async function closeEnhancedDb(): Promise<void> {
  if (enhancedPoolInstance) {
    await enhancedPoolInstance.destroy();
    enhancedPoolInstance = null;
  }
  enhancedDbInstance = null;
  enhancedDbInitPromise = null;
}

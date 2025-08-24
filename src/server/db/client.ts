// src/server/db/client.ts
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool, PoolConfig } from "pg";

let dbInstance: NodePgDatabase | null = null;
let dbInitPromise: Promise<NodePgDatabase> | null = null;
let poolInstance: Pool | null = null;

// Test-only injection for deterministic mocking
interface TestOverrides {
  PoolCtor?: new (config: PoolConfig) => Pool;
  drizzleFn?: (pool: Pool | unknown) => NodePgDatabase;
}

let testOverrides: TestOverrides = {};

export function __setDbDriversForTest(overrides: TestOverrides): void {
  testOverrides = overrides;
  // reset so next call rebuilds with overrides
  dbInstance = null;
  dbInitPromise = null;
  if (poolInstance) {
    void poolInstance.end();
    poolInstance = null;
  }
}

/**
 * Pool configuration with optimized settings for CRM workload
 */
function getPoolConfig(databaseUrl: string): PoolConfig {
  return {
    connectionString: databaseUrl,
    max: 10, // Maximum connections in pool
    min: 2,  // Minimum connections to maintain
    idleTimeoutMillis: 30000, // 30 seconds idle timeout
    connectionTimeoutMillis: 10000, // 10 seconds connection timeout
    maxUses: 7500, // Rotate connections after 7500 uses
    allowExitOnIdle: false, // Keep pool alive
  };
}

/**
 * Lazily initialize and return a singleton Drizzle database instance with connection pooling.
 * No connection is attempted at module import time.
 */
export async function getDb(): Promise<NodePgDatabase> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  dbInitPromise = (async (): Promise<NodePgDatabase> => {
    const PoolCtor = testOverrides.PoolCtor ?? (await import("pg")).Pool;
    const drizzleFn =
      testOverrides.drizzleFn ?? (await import("drizzle-orm/node-postgres")).drizzle;
    
    const poolConfig = getPoolConfig(databaseUrl);
    const pool = new PoolCtor(poolConfig);
    poolInstance = pool;
    
    // Test the pool connection
    const client = await pool.connect();
    client.release();
    
    // Type assertion is necessary for test injection compatibility.
    // The drizzleFn accepts different pool types in test vs production.
    // This is safe because drizzleFn validates the pool interface internally.
    const instance = drizzleFn(pool as Pool) as NodePgDatabase;
    dbInstance = instance;
    return instance;
  })();

  try {
    const result = await dbInitPromise;
    if (!result) {
      throw new Error("Database initialization failed");
    }
    return result;
  } finally {
    // Clear the init promise once resolved so subsequent calls use the cached instance
    dbInitPromise = null;
  }
}

/**
 * A lightweight proxy that defers method calls to the lazily initialized db.
 * Example: await db.execute(sql`select 1`)
 */
export const db: NodePgDatabase = new Proxy({} as NodePgDatabase, {
  get(_target, propertyKey: string | symbol) {
    return (...args: unknown[]) =>
      getDb().then((resolvedDb: NodePgDatabase) => {
        // Safe member access on resolved database instance
        const memberRecord = resolvedDb as unknown as Record<string | symbol, unknown>;
        const member = memberRecord[propertyKey];
        if (typeof member === "function") {
          return (member as (...args: unknown[]) => unknown).apply(resolvedDb, args);
        }
        return member;
      });
  },
});

/**
 * Get the underlying connection pool for advanced operations
 */
export function getPool(): Pool | null {
  return poolInstance;
}

/**
 * Gracefully close the database pool
 */
export async function closeDb(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
  dbInstance = null;
  dbInitPromise = null;
}

// use with your table objects from schema.ts

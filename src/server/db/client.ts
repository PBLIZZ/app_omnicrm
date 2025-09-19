// src/server/db/client.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let dbInstance: PostgresJsDatabase<typeof schema> | null = null;
let dbInitPromise: Promise<PostgresJsDatabase<typeof schema>> | null = null;
let sqlInstance: ReturnType<typeof postgres> | null = null;

// Test-only injection for deterministic mocking
interface TestOverrides {
  postgresFn?: typeof postgres;
  drizzleFn?: typeof drizzle;
}

let testOverrides: TestOverrides = {};

export function __setDbDriversForTest(overrides: TestOverrides): void {
  testOverrides = overrides;
  // reset so next call rebuilds with overrides
  dbInstance = null;
  dbInitPromise = null;
  if (sqlInstance) {
    void sqlInstance.end();
    sqlInstance = null;
  }
}

/**
 * Postgres.js configuration optimized for Supabase Transaction mode
 */
function getPostgresConfig(): {
  prepare: boolean;
  max: number;
  idle_timeout: number;
  connect_timeout: number;
  max_lifetime: number;
  transform: { undefined: null };
} {
  return {
    prepare: false, // CRITICAL: Disable prepared statements for Supabase Transaction mode
    max: 10, // Maximum connections in pool
    idle_timeout: 30, // 30 seconds idle timeout
    connect_timeout: 30, // 30 seconds connection timeout (increased for reliability)
    max_lifetime: 60 * 60, // 1 hour connection lifetime
    transform: {
      undefined: null, // Transform undefined to null
    },
  };
}

/**
 * Lazily initialize and return a singleton Drizzle database instance with postgres.js.
 * No connection is attempted at module import time.
 */
export async function getDb(): Promise<PostgresJsDatabase<typeof schema>> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  dbInitPromise = (async (): Promise<PostgresJsDatabase<typeof schema>> => {
    const postgresFn = testOverrides.postgresFn ?? postgres;
    const drizzleFn = testOverrides.drizzleFn ?? drizzle;

    const config = getPostgresConfig();
    const sql = postgresFn(databaseUrl, config);
    sqlInstance = sql;

    // Test the connection
    await sql`SELECT 1`;

    const instance = drizzleFn(sql, { schema });
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
export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {} as PostgresJsDatabase<typeof schema>,
  {
    get(target, propertyKey: string | symbol) {
      // Proxy handler acknowledges target parameter for type compliance
      void target;
      return (...args: unknown[]) =>
        getDb().then((resolvedDb: PostgresJsDatabase<typeof schema>) => {
          // Safe member access on resolved database instance
          const memberRecord = resolvedDb as unknown as Record<string | symbol, unknown>;
          const member = memberRecord[propertyKey];
          if (typeof member === "function") {
            return (member as (...args: unknown[]) => unknown).apply(resolvedDb, args);
          }
          return member;
        });
    },
  },
);

/**
 * Get the underlying SQL instance for advanced operations
 */
export function getSql(): ReturnType<typeof postgres> | null {
  return sqlInstance;
}

/**
 * Gracefully close the database connection
 */
export async function closeDb(): Promise<void> {
  if (sqlInstance) {
    await sqlInstance.end();
    sqlInstance = null;
  }
  dbInstance = null;
  dbInitPromise = null;
}

// use with your table objects from schema.ts

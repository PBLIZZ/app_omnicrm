// src/server/db/client.ts
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
let dbInstance: NodePgDatabase | null = null;
let dbInitPromise: Promise<NodePgDatabase> | null = null;

// Test-only injection for deterministic mocking
interface TestOverrides {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ClientCtor?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drizzleFn?: any;
}

let testOverrides: TestOverrides = {};

export function __setDbDriversForTest(overrides: TestOverrides) {
  testOverrides = overrides;
  // reset so next call rebuilds with overrides
  dbInstance = null;
  dbInitPromise = null;
}

/**
 * Lazily initialize and return a singleton Drizzle database instance.
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
    const ClientCtor = testOverrides.ClientCtor ?? (await import("pg")).Client;
    const drizzleFn =
      testOverrides.drizzleFn ?? (await import("drizzle-orm/node-postgres")).drizzle;
    const client = new ClientCtor({ connectionString: databaseUrl });
    await client.connect();
    const instance = drizzleFn(client) as NodePgDatabase;
    dbInstance = instance;
    return instance;
  })();

  try {
    return (await dbInitPromise)!;
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
        const member = (resolvedDb as unknown as Record<string | symbol, unknown>)[propertyKey];
        if (typeof member === "function") {
          return (member as (...args: unknown[]) => unknown).apply(resolvedDb, args);
        }
        return member;
      });
  },
});

// use with your table objects from schema.ts

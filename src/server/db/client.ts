// src/server/db/client.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/server/db/schema";

let dbInstance: PostgresJsDatabase<typeof schema> | null = null;
let dbInitPromise: Promise<PostgresJsDatabase<typeof schema>> | null = null;
let sqlInstance: ReturnType<typeof postgres> | null = null;

// Test-only injection for deterministic mocking
interface TestOverrides {
  postgresFn?: typeof postgres;
  drizzleFn?: typeof drizzle;
}

let testOverrides: TestOverrides = {};

export type DbClient = PostgresJsDatabase<typeof schema>;

export function __setDbDriversForTest(overrides: TestOverrides): void {
  testOverrides = overrides;
  dbInstance = null;
  dbInitPromise = null;
  if (sqlInstance) {
    void sqlInstance.end();
    sqlInstance = null;
  }
}

function isManagedHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return /(supabase|neon|render|timescaledb|aws|amazonaws|gcp|heroku|fly|railway)/i.test(host);
  } catch {
    // If URL parsing fails, assume managed to prefer secure defaults
    return true;
  }
}

/**
 * Postgres.js configuration (pgBouncer/transaction-mode friendly)
 * Note: postgres.js ignores sslmode in the URL; pass ssl here if needed.
 */
function getPostgresConfig(databaseUrl: string): Parameters<typeof postgres>[1] {
  const managed = isManagedHost(databaseUrl);
  return {
    prepare: false, // critical for pgBouncer transaction mode
    max: 10,
    idle_timeout: 30,
    connect_timeout: 30,
    max_lifetime: 60 * 60,
    ...(managed ? { ssl: { rejectUnauthorized: false } as const } : {}),
    transform: { undefined: null },
  };
}

/** Narrow types without using `any` */
type AggregateErrorLike = Error & { errors?: unknown[] };

function isAggregateErrorLike(e: unknown): e is AggregateErrorLike {
  return typeof e === "object" && e !== null && Array.isArray((e as { errors?: unknown[] }).errors);
}

function getStringProp<T extends string>(obj: unknown, key: T): string | undefined {
  if (typeof obj === "object" && obj !== null && key in (obj as Record<string, unknown>)) {
    const v = (obj as Record<string, unknown>)[key];
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

/**
 * Create a readable error message for connection issues, without leaking secrets.
 */
export function normalizePgError(err: unknown, databaseUrl: string): Error {
  const u = new URL(databaseUrl);
  const where = `${u.hostname}:${u.port || "5432"}/${u.pathname.replace("/", "")}`;

  let first: unknown = err;
  if (isAggregateErrorLike(err) && err.errors && err.errors.length > 0) {
    first = err.errors[0];
  }

  const code = getStringProp(first, "code") ?? getStringProp(first, "errno") ?? "";
  const name = getStringProp(first, "name") ?? getStringProp(first, "type") ?? "ConnectionError";
  const msg = getStringProp(first, "message") ?? String(first);

  const e = new Error(
    `Database connect failed (${name}${code ? `:${code}` : ""}) to ${where}: ${msg}`,
  );

  // Attach cause (compatible even if lib doesn't include ES2022 typings)
  try {
    Object.defineProperty(e, "cause", { value: err, configurable: true });
  } catch {
    /* no-op */
  }

  return e;
}

/** Small retry helper for transient cold-start/net hiccups */
async function selectOneWithRetry(sql: ReturnType<typeof postgres>, retries = 2): Promise<void> {
  let last: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      await sql`select 1`;
      return;
    } catch (e) {
      last = e;
      if (i < retries) {
        // linear backoff: 150ms, 300ms
        await new Promise((r) => setTimeout(r, 150 * (i + 1)));
      }
    }
  }
  throw last;
}

/**
 * Lazily initialize and return a singleton Drizzle database instance with postgres.js.
 * No connection is attempted at module import time.
 */
export async function getDb(): Promise<PostgresJsDatabase<typeof schema>> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  dbInitPromise = (async (): Promise<PostgresJsDatabase<typeof schema>> => {
    const postgresFn = testOverrides.postgresFn ?? postgres;
    const drizzleFn = testOverrides.drizzleFn ?? drizzle;

    const config = getPostgresConfig(databaseUrl);
    const sql = postgresFn(databaseUrl, config);
    sqlInstance = sql;

    try {
      // Force an early connectivity check so later calls don't fail deep inside a request
      await selectOneWithRetry(sql);
    } catch (e) {
      throw normalizePgError(e, databaseUrl);
    }

    const instance = drizzleFn(sql, { schema });
    dbInstance = instance;
    return instance;
  })();

  try {
    const result = await dbInitPromise;
    if (!result) throw new Error("Database initialization failed");
    return result;
  } finally {
    // Clear the init promise once resolved so subsequent calls use the cached instance
    dbInitPromise = null;
  }
}

/**
 * A lightweight proxy that defers member access/calls to the lazily initialized db.
 * Example: await db.execute(sql`select 1`)
 */
export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {} as PostgresJsDatabase<typeof schema>,
  {
    get(target, propertyKey: string | symbol) {
      void target;
      return (...args: unknown[]) =>
        getDb().then((resolvedDb: PostgresJsDatabase<typeof schema>) => {
          const member = (resolvedDb as unknown as Record<string | symbol, unknown>)[propertyKey];
          return typeof member === "function"
            ? (member as (...a: unknown[]) => unknown).apply(resolvedDb, args)
            : member;
        });
    },
  },
);

/** Get the underlying SQL instance for advanced operations */
export function getSql(): ReturnType<typeof postgres> | null {
  return sqlInstance;
}

/** Gracefully close the database connection */
export async function closeDb(): Promise<void> {
  if (sqlInstance) {
    await sqlInstance.end();
    sqlInstance = null;
  }
  dbInstance = null;
  dbInitPromise = null;
}

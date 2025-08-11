import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

describe("db client lazy initialization", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("does not initialize pg Client on import; initializes once on first getDb() and reuses thereafter", async () => {
    process.env["DATABASE_URL"] = "postgres://user:pass@localhost:5432/db";

    let constructCount = 0;
    const connect = vi.fn().mockResolvedValue(undefined);

    class MockClient {
      constructor() {
        constructCount += 1;
      }
      connect = connect;
    }
    const execute = vi.fn().mockResolvedValue(undefined);
    const drizzle = () => ({ execute });

    const { getDb, __setDbDriversForTest } = await import("@/server/db/client");
    __setDbDriversForTest({
      ClientCtor: MockClient as new (config: { connectionString: string }) => {
        connect(): Promise<void>;
        [key: string]: unknown;
      },
      drizzleFn: drizzle as (client: unknown) => NodePgDatabase,
    });

    expect(constructCount).toBe(0);

    const first = await getDb();
    expect(first).toBeTruthy();
    expect(constructCount).toBe(1);
    expect(connect).toHaveBeenCalledTimes(1);

    const second = await getDb();
    expect(second).toBe(first);
    expect(constructCount).toBe(1);
  });

  it("db proxy forwards calls after lazy init", async () => {
    process.env["DATABASE_URL"] = "postgres://user:pass@localhost:5432/db";

    class MockClient {
      connect = vi.fn().mockResolvedValue(undefined);
    }
    const execute = vi.fn().mockResolvedValue({ rows: [{ one: 1 }] });
    const drizzle = () => ({ execute });

    const { db, __setDbDriversForTest } = await import("@/server/db/client");
    __setDbDriversForTest({
      ClientCtor: MockClient as new (config: { connectionString: string }) => {
        connect(): Promise<void>;
        [key: string]: unknown;
      },
      drizzleFn: drizzle as (client: unknown) => NodePgDatabase,
    });
    const result = await (
      db as NodePgDatabase & { execute: (query: string) => Promise<unknown> }
    ).execute("select 1");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ rows: [{ one: 1 }] });
  });

  it("throws helpful error when DATABASE_URL is missing", async () => {
    delete process.env["DATABASE_URL"];

    class MockClient {
      connect = vi.fn();
    }
    const drizzle = () => ({ execute: vi.fn() });
    const { getDb, db, __setDbDriversForTest } = await import("@/server/db/client");
    __setDbDriversForTest({
      ClientCtor: MockClient as new (config: { connectionString: string }) => {
        connect(): Promise<void>;
        [key: string]: unknown;
      },
      drizzleFn: drizzle as (client: unknown) => NodePgDatabase,
    });
    await expect(getDb()).rejects.toThrow(/DATABASE_URL is not set/);

    await expect(
      (db as NodePgDatabase & { execute: (query: string) => Promise<unknown> }).execute("select 1"),
    ).rejects.toThrow();
  });
});

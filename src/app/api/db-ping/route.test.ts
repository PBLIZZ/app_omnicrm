import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

describe("/api/db-ping", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env["DATABASE_URL"] = "postgres://user:pass@localhost:5432/db";
  });

  it("returns 200 when db.execute succeeds", async () => {
    class MockClient {
      connect = vi.fn().mockResolvedValue(undefined);
    }
    const execute = vi.fn().mockResolvedValue(undefined);
    const drizzle = () => ({ execute }) as unknown as NodePgDatabase;
    const { __setDbDriversForTest } = await import("../../../server/db/client");
    __setDbDriversForTest({
      ClientCtor: MockClient as unknown as new (config: { connectionString: string }) => {
        connect(): Promise<void>;
        [key: string]: unknown;
      },
      drizzleFn: drizzle as (client: unknown) => NodePgDatabase,
    });

    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, data: {} });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when db.execute throws", async () => {
    class MockClient {
      connect = vi.fn().mockResolvedValue(undefined);
    }
    const execute = vi.fn().mockRejectedValue(new Error("db down"));
    const drizzle = () => ({ execute }) as unknown as NodePgDatabase;
    const { __setDbDriversForTest } = await import("../../../server/db/client");
    __setDbDriversForTest({
      ClientCtor: MockClient as unknown as new (config: { connectionString: string }) => {
        connect(): Promise<void>;
        [key: string]: unknown;
      },
      drizzleFn: drizzle as (client: unknown) => NodePgDatabase,
    });

    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "db_error", details: null });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

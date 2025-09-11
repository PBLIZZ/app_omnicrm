import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { NextRequest } from "next/server";

describe("/api/db-ping", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env["DATABASE_URL"] = "postgres://user:pass@localhost:5432/db";
  });

  it("returns 200 when db.execute succeeds", async () => {
    const mockSql = vi.fn().mockResolvedValue([{ "?column?": 1 }]);
    mockSql.end = vi.fn().mockResolvedValue(undefined);
    const mockPostgres = vi.fn(() => mockSql);

    const execute = vi.fn().mockResolvedValue(undefined);
    const drizzle = vi.fn(() => ({ execute }) as unknown as NodePgDatabase);
    const { __setDbDriversForTest } = await import("../../../server/db/client");
    __setDbDriversForTest({
      postgresFn: mockPostgres,
      drizzleFn: drizzle as (client: unknown) => NodePgDatabase,
    });

    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost:3000/api/db-ping");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ status: "healthy" });
    // Verify the error was handled properly
  });

  it("returns 500 when db.execute throws", async () => {
    const mockSql = vi.fn().mockRejectedValue(new Error("db down"));
    mockSql.end = vi.fn().mockResolvedValue(undefined);
    const mockPostgres = vi.fn(() => mockSql);

    const execute = vi.fn().mockRejectedValue(new Error("db down"));
    const drizzle = vi.fn(() => ({ execute }) as unknown as NodePgDatabase);
    const { __setDbDriversForTest } = await import("../../../server/db/client");
    __setDbDriversForTest({
      postgresFn: mockPostgres,
      drizzleFn: drizzle as (client: unknown) => NodePgDatabase,
    });

    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost:3000/api/db-ping");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("DATABASE_ERROR");
    expect(body.error).toBe("Database connection failed");
    // Verify the error was handled properly
  });
});

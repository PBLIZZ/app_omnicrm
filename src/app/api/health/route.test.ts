import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/server/log", () => ({
  log: {
    info: vi.fn(),
  },
}));

vi.mock("@/server/log-context", () => ({
  buildLogContext: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  sql: vi.fn().mockReturnValue("SELECT 1"),
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns health status with database check when DATABASE_URL is set", async () => {
    process.env.DATABASE_URL = "postgresql://test@localhost/test";

    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    };

    const dbClientMod = await import("@/server/db/client");
    (dbClientMod.getDb as vi.MockedFunction<typeof dbClientMod.getDb>).mockResolvedValue(
      mockDb as any,
    );

    const response = await GET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.ts).toBeDefined();
    expect(typeof json.data.ts).toBe("string");
    expect(typeof json.data.db).toBe("boolean");
    expect(json.data.db).toBe(true);

    // Verify timestamp format (ISO string)
    expect(new Date(json.data.ts).toISOString()).toBe(json.data.ts);
  });

  it("returns health status with db:false when database connection fails", async () => {
    process.env.DATABASE_URL = "postgresql://test@localhost/test";

    const dbClientMod = await import("@/server/db/client");
    (dbClientMod.getDb as vi.MockedFunction<typeof dbClientMod.getDb>).mockRejectedValue(
      new Error("Connection failed"),
    );

    const response = await GET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.ts).toBeDefined();
    expect(json.data.db).toBe(false);
  });

  it("returns health status with db:undefined when DATABASE_URL is not set", async () => {
    delete process.env.DATABASE_URL;

    const response = await GET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.ts).toBeDefined();
    expect(json.data.db).toBeUndefined();
  });

  it("handles database timeout correctly", async () => {
    process.env.DATABASE_URL = "postgresql://test@localhost/test";

    const mockDb = {
      execute: vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000))),
    };

    const dbClientMod = await import("@/server/db/client");
    (dbClientMod.getDb as vi.MockedFunction<typeof dbClientMod.getDb>).mockResolvedValue(
      mockDb as any,
    );

    const response = await GET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.db).toBe(true); // Should still be true as timeout resolves the race
  });

  it("logs health ping with correct context", async () => {
    const logMod = await import("@/server/log");
    const logContextMod = await import("@/server/log-context");

    await GET();

    expect(logContextMod.buildLogContext).toHaveBeenCalled();
    expect(logMod.log.info).toHaveBeenCalledWith({ route: "/api/health" }, "health ping");
  });

  it("returns correct envelope structure", async () => {
    const response = await GET();
    const json = await response.json();

    // Verify envelope structure matches OkEnvelope<{ts: string, db?: boolean}>
    expect(json).toHaveProperty("ok", true);
    expect(json).toHaveProperty("data");
    expect(json.data).toHaveProperty("ts");
    expect(typeof json.data.ts).toBe("string");

    if (json.data.db !== undefined) {
      expect(typeof json.data.db).toBe("boolean");
    }
  });
});

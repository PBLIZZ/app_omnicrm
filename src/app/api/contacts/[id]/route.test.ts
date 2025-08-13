import { describe, it, expect, vi, beforeEach, type MockedFunction, type Mock } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/server/auth/user", () => ({ getServerUserId: vi.fn() }));
vi.mock("@/server/db/client", () => ({ getDb: vi.fn() }));

describe("contacts id route", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 404 when not found", async () => {
    const mod = await import("./route");
    const userMod = await import("../../../../server/auth/user");
    const dbMod = await import("../../../../server/db/client");
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );
    (dbMod.getDb as Mock).mockResolvedValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([]),
      }),
    });
    const req = {} as unknown as NextRequest;
    const res = await mod.GET(req, { params: { id: "c1" } });
    expect(res.status).toBe(404);
  });

  it("updates contact on PUT", async () => {
    const mod = await import("./route");
    const userMod = await import("../../../../server/auth/user");
    const dbMod = await import("../../../../server/db/client");
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );
    (dbMod.getDb as Mock).mockResolvedValue({
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([
          {
            id: "c1",
            displayName: "Alice B",
            primaryEmail: null,
            primaryPhone: null,
            source: "manual",
            createdAt: new Date("2025-01-01T00:00:00.000Z"),
          },
        ]),
      }),
    });
    const req = new Request("https://x", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Alice B" }),
    }) as unknown as NextRequest;
    const res = await mod.PUT(req, { params: { id: "c1" } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.displayName).toBe("Alice B");
  });

  it("deletes contact on DELETE", async () => {
    const mod = await import("./route");
    const userMod = await import("../../../../server/auth/user");
    const dbMod = await import("../../../../server/db/client");
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );
    (dbMod.getDb as Mock).mockResolvedValue({
      delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValueOnce(undefined) }),
    });
    const req = {} as unknown as NextRequest;
    const res = await mod.DELETE(req, { params: { id: "c1" } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.deleted).toBeGreaterThanOrEqual(0);
  });
});

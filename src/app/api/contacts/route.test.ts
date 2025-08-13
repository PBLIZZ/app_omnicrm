import { describe, it, expect, vi, beforeEach, type MockedFunction, type Mock } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/server/auth/user", () => ({ getServerUserId: vi.fn() }));
vi.mock("@/server/db/client", () => ({ getDb: vi.fn() }));
vi.mock("drizzle-orm/node-postgres", () => ({}));

describe("contacts route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("requires auth", async () => {
    const mod = await import("./route");
    const userMod = await import("../../../server/auth/user");
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { status: 401 }),
    );
    const url = new URL("https://example.com/api/contacts");
    const req = { nextUrl: url } as unknown as NextRequest;
    const res = await mod.GET(req);
    expect(res.status).toBe(401);
  });

  it("returns empty list with total 0 when none", async () => {
    const mod = await import("./route");
    const userMod = await import("../../../server/auth/user");
    const dbMod = await import("../../../server/db/client");
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );
    const itemsBuilder = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValueOnce([]),
    };
    const countBuilder = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValueOnce([{ n: 0 }]),
    };
    (dbMod.getDb as Mock).mockResolvedValue({
      select: vi.fn().mockReturnValueOnce(itemsBuilder).mockReturnValueOnce(countBuilder),
    });
    const url = new URL("https://example.com/api/contacts");
    const req = { nextUrl: url } as unknown as NextRequest;
    const res = await mod.GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.items).toEqual([]);
    expect(json.data.total).toBe(0);
  });

  it("rejects invalid POST body", async () => {
    const mod = await import("./route");
    const userMod = await import("../../../server/auth/user");
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );
    const req = new Request("https://example.com/api/contacts", {
      method: "POST",
      body: JSON.stringify({ displayName: "" }),
    }) as unknown as NextRequest;
    const res = await mod.POST(req);
    expect(res.status).toBe(400);
  });

  it("creates contact on POST", async () => {
    const mod = await import("./route");
    const userMod = await import("../../../server/auth/user");
    const dbMod = await import("../../../server/db/client");
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );
    (dbMod.getDb as Mock).mockResolvedValue({
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([
          {
            id: "c1",
            displayName: "Alice",
            primaryEmail: null,
            primaryPhone: null,
            createdAt: new Date("2025-01-01T00:00:00.000Z"),
          },
        ]),
      }),
    });
    const req = new Request("https://example.com/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Alice",
        primaryEmail: null,
        primaryPhone: null,
        tags: [],
        notes: null,
        source: "manual",
      }),
    }) as unknown as NextRequest;
    const res = await mod.POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.id).toBe("c1");
  });
});

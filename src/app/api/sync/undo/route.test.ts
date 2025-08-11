import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";
import type { NextRequest } from "next/server";
vi.mock("@/server/auth/user", () => ({ getServerUserId: vi.fn().mockResolvedValue("u1") }));
vi.mock("@/server/db/client", () => ({
  db: {
    delete: () => ({ where: () => ({}) }),
    update: () => ({ set: () => ({ where: () => ({}) }) }),
  },
}));

describe("undo route", () => {
  it("requires batchId and returns error envelope", async () => {
    const req = new Request("https://example.com", { method: "POST", body: JSON.stringify({}) });
    const res = await POST(req as NextRequest);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "missing_batchId", details: null });
  });

  it("returns ok envelope when undone", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      body: JSON.stringify({ batchId: "b1" }),
    });
    const res = await POST(req as NextRequest);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { undone: "b1" } });
  });
});

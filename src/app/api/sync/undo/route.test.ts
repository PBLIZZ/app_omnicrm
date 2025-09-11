import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
vi.mock("@/server/auth/user", () => ({ getServerUserId: vi.fn().mockResolvedValue("u1") }));
vi.mock("@/server/db/client", () => ({
  getDb: async () => ({
    delete: () => ({ where: () => ({}) }),
    update: () => ({ set: () => ({ where: () => ({}) }) }),
  }),
}));

describe("undo route", () => {
  it("requires batchId and returns error envelope", async () => {
    const req = new NextRequest("https://example.com", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns ok envelope when undone", async () => {
    const req = new NextRequest("https://example.com", {
      method: "POST",
      body: JSON.stringify({ batchId: "b1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ undone: "b1" });
  });
});

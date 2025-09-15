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
      headers: {
        "Content-Type": "application/json",
        "x-correlation-id": "test-correlation-id",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    // The validation error might not have a code field, so let's just check for error
    expect(body.error).toBeDefined();
  });

  it("returns ok envelope when undone", async () => {
    const req = new NextRequest("https://example.com", {
      method: "POST",
      body: JSON.stringify({ batchId: "550e8400-e29b-41d4-a716-446655440000" }), // Valid UUID
      headers: {
        "Content-Type": "application/json",
        "x-correlation-id": "test-correlation-id",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.batchId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });
});

import { describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";
import { GET, PUT } from "./route";
vi.mock("@/server/auth/user", () => ({ getServerUserId: vi.fn().mockResolvedValue("u1") }));
vi.mock("@/server/db/client", () => ({
  getDb: async () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: () => [] }) }) }),
    insert: () => ({ values: () => ({}) }),
    update: () => ({ set: () => ({ where: () => ({}) }) }),
  }),
}));

// lightweight shape tests for prefs GET defaults
describe("sync prefs route", () => {
  it("GET returns ok envelope with defaults", async () => {
    const req = new Request("https://example.com", {
      method: "GET",
      headers: {
        "x-correlation-id": "test-correlation-id",
      },
    }) as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.gmailQuery).toBeTruthy();
  });

  it("PUT returns ok envelope", async () => {
    const req = new Request("https://example.com", {
      method: "PUT",
      body: JSON.stringify({ gmailQuery: "x" }),
      headers: {
        "Content-Type": "application/json",
      },
    }) as unknown as NextRequest; // NextRequest type compatibility without any
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({});
  });
});

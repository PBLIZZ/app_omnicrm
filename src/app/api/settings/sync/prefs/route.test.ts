import { describe, it, expect, vi } from "vitest";
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
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.gmailQuery).toBeTruthy();
  });

  it("PUT returns ok envelope", async () => {
    const res = await PUT(
      new Request("https://example.com", {
        method: "PUT",
        body: JSON.stringify({ gmailQuery: "x" }),
      }) as Request,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: {} });
  });
});

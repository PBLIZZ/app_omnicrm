import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/auth/user", () => ({ getServerUserId: vi.fn() }));
vi.mock("@/server/db/client", () => ({
  getDb: async () => ({ select: () => ({ from: () => ({ where: () => ({ limit: () => [] }) }) }) }),
}));
vi.mock("@/server/google/gmail", () => ({ gmailPreview: vi.fn().mockResolvedValue({ count: 0 }) }));
vi.mock("@/server/sync/audit", () => ({ logSync: vi.fn() }));

describe("gmail preview route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 404 with {ok:false} when feature flag disabled", async () => {
    process.env.FEATURE_GOOGLE_GMAIL_RO = "0";
    const userMod = await import("@/server/auth/user");
    (
      userMod.getServerUserId as vi.MockedFunction<typeof userMod.getServerUserId>
    ).mockResolvedValue("u1");
    const { POST } = await import("./route");
    const res = await POST();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "not_found", details: null });
  });

  it("returns ok envelope when enabled", async () => {
    process.env.FEATURE_GOOGLE_GMAIL_RO = "1";
    const userMod = await import("@/server/auth/user");
    (
      userMod.getServerUserId as vi.MockedFunction<typeof userMod.getServerUserId>
    ).mockResolvedValue("u1");
    const { POST } = await import("./route");
    const res = await POST(new Request("https://example.com", { method: "POST", body: "{}" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toBeTruthy();
  });
});

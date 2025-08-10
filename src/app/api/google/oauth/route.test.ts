import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";

vi.mock("@/server/sync/audit", () => ({ logSync: vi.fn() }));
vi.mock("@/server/auth/user", () => ({ getServerUserId: vi.fn() }));
vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: class {
        generateAuthUrl() {
          return "https://example.com/oauth";
        }
      },
    },
  },
}));

describe("google oauth route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    delete process.env.FEATURE_GOOGLE_GMAIL_RO;
    delete process.env.FEATURE_GOOGLE_CALENDAR_RO;
  });

  it("returns 400 with error envelope for invalid scope", async () => {
    const userMod = await import("@/server/auth/user");
    (userMod.getServerUserId as any).mockResolvedValue("u1");
    const req = new Request("https://example.com/api/google/oauth?scope=foo");
    const res = await GET(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ ok: false, error: "invalid_scope", details: { scope: "foo" } });
  });

  it("returns 401 with error envelope when unauthorized", async () => {
    const userMod = await import("@/server/auth/user");
    (userMod.getServerUserId as any).mockRejectedValue({ status: 401, message: "Unauthorized" });
    const req = new Request("https://example.com/api/google/oauth?scope=gmail");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ ok: false, error: "Unauthorized", details: null });
  });
});

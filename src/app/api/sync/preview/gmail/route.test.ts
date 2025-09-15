import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/server/auth/user", () => ({ getServerUserId: vi.fn() }));
vi.mock("@/server/db/client", () => ({
  getDb: async () => ({ select: () => ({ from: () => ({ where: () => ({ limit: () => [] }) }) }) }),
}));
vi.mock("@/server/google/gmail", () => ({
  gmailPreview: vi.fn().mockResolvedValue({
    count: 0,
    countByLabel: {},
    sampleSubjects: [],
    pages: 1,
    itemsFiltered: 0,
    durationMs: 100,
  }),
}));
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
    const req = new Request("https://example.com", {
      method: "POST",
      body: "{}",
      headers: {
        "Content-Type": "application/json",
        "x-correlation-id": "test-correlation-id",
      },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("not_found");
  });

  it("returns ok envelope when enabled", async () => {
    process.env.FEATURE_GOOGLE_GMAIL_RO = "1";
    const userMod = await import("@/server/auth/user");
    const gmailMod = await import("@/server/google/gmail");
    (
      userMod.getServerUserId as vi.MockedFunction<typeof userMod.getServerUserId>
    ).mockResolvedValue("u1");
    (gmailMod.gmailPreview as vi.MockedFunction<typeof gmailMod.gmailPreview>).mockResolvedValue({
      count: 0,
      countByLabel: {},
      sampleSubjects: [],
      pages: 1,
      itemsFiltered: 0,
      durationMs: 100,
    });
    const { POST } = await import("./route");
    const req = new Request("https://example.com", {
      method: "POST",
      body: "{}",
      headers: {
        "Content-Type": "application/json",
        "x-correlation-id": "test-correlation-id",
      },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toBeTruthy();
  });
});

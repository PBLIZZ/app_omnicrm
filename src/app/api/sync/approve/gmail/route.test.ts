import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/server/auth/user", () => ({ getServerUserId: vi.fn() }));
vi.mock("@/server/sync/audit", () => ({ logSync: vi.fn() }));
vi.mock("@/server/jobs/enqueue", () => ({ enqueue: vi.fn() }));

describe("gmail approve route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 404 with error envelope when feature disabled", async () => {
    process.env.FEATURE_GOOGLE_GMAIL_RO = "0";
    const userMod = await import("../../../../../server/auth/user");
    (
      userMod.getServerUserId as vi.MockedFunction<typeof userMod.getServerUserId>
    ).mockResolvedValue("u1");
    const res = await POST(new Request("https://example.com", { method: "POST", body: "{}" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "not_found", details: null });
  });

  it("returns ok envelope with batchId when enabled", async () => {
    process.env.FEATURE_GOOGLE_GMAIL_RO = "1";
    const auditMod = await import("../../../../../server/sync/audit");
    const enqueueMod = await import("../../../../../server/jobs/enqueue");
    const userMod = await import("../../../../../server/auth/user");
    (
      userMod.getServerUserId as vi.MockedFunction<typeof userMod.getServerUserId>
    ).mockResolvedValue("u1");
    (auditMod.logSync as vi.Mock).mockResolvedValue(undefined);
    (enqueueMod.enqueue as vi.Mock).mockResolvedValue(undefined);
    const res = await POST(new Request("https://example.com", { method: "POST", body: "{}" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(typeof json.data.batchId).toBe("string");
  });
});

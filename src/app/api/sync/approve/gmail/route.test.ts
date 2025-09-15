import { describe, it, expect, vi, beforeEach, type MockedFunction, type Mock } from "vitest";
import type { NextRequest } from "next/server";
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
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: "{}",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": "test-correlation-id",
        },
      }) as unknown as NextRequest,
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("not_found");
  });

  it("returns ok envelope with batchId when enabled", async () => {
    process.env.FEATURE_GOOGLE_GMAIL_RO = "1";
    const auditMod = await import("../../../../../server/sync/audit");
    const enqueueMod = await import("../../../../../server/jobs/enqueue");
    const userMod = await import("../../../../../server/auth/user");
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );
    (auditMod.logSync as Mock).mockResolvedValue(undefined);
    (enqueueMod.enqueue as Mock).mockResolvedValue(undefined);
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: "{}",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": "test-correlation-id",
        },
      }) as unknown as NextRequest,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(typeof json.data.batchId).toBe("string");
  });
});

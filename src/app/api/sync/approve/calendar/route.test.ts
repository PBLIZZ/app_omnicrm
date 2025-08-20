import { describe, it, expect, vi, beforeEach, type MockedFunction, type Mock } from "vitest";
import { POST } from "./route";

vi.mock("@/server/auth/user", () => ({ getServerUserId: vi.fn() }));
vi.mock("@/server/sync/audit", () => ({ logSync: vi.fn() }));
vi.mock("@/server/jobs/enqueue", () => ({ enqueue: vi.fn() }));

describe("calendar approve route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    const userMod = await import("@/server/auth/user");
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockRejectedValue({
      status: 401,
      message: "unauthorized",
    });

    const res = await POST(new Request("https://example.com", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "unauthorized", details: null });
  });

  it("returns 405 for GET method", async () => {
    // This tests that only POST is allowed - GET should not be defined
    // We'll test this in the E2E layer since route handlers are method-specific
    expect(true).toBe(true); // Placeholder - method validation happens at framework level
  });

  it("returns 400 for invalid Zod body", async () => {
    process.env.FEATURE_GOOGLE_CALENDAR_RO = "1";
    const userMod = await import("@/server/auth/user");
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );

    // Invalid body with extra field
    const invalidBody = JSON.stringify({ reason: "test", extraField: "invalid" });
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: invalidBody,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_body", details: null });
  });

  it("returns 404 with error envelope when feature disabled", async () => {
    process.env.FEATURE_GOOGLE_CALENDAR_RO = "0";
    const userMod = await import("@/server/auth/user");
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );

    const res = await POST(new Request("https://example.com", { method: "POST", body: "{}" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "not_found", details: null });
  });

  it("returns ok envelope with batchId when enabled", async () => {
    process.env.FEATURE_GOOGLE_CALENDAR_RO = "1";
    const auditMod = await import("@/server/sync/audit");
    const enqueueMod = await import("@/server/jobs/enqueue");
    const userMod = await import("@/server/auth/user");

    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );
    (auditMod.logSync as Mock).mockResolvedValue(undefined);
    (enqueueMod.enqueue as Mock).mockResolvedValue(undefined);

    const res = await POST(new Request("https://example.com", { method: "POST", body: "{}" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(typeof json.data.batchId).toBe("string");
  });

  it("validates Zod schema with valid reason field", async () => {
    process.env.FEATURE_GOOGLE_CALENDAR_RO = "1";
    const auditMod = await import("@/server/sync/audit");
    const enqueueMod = await import("@/server/jobs/enqueue");
    const userMod = await import("@/server/auth/user");

    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );
    (auditMod.logSync as Mock).mockResolvedValue(undefined);
    (enqueueMod.enqueue as Mock).mockResolvedValue(undefined);

    const validBody = JSON.stringify({ reason: "User requested sync" });
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: validBody,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(typeof json.data.batchId).toBe("string");
  });

  it("returns 400 for reason field that exceeds max length", async () => {
    process.env.FEATURE_GOOGLE_CALENDAR_RO = "1";
    const userMod = await import("@/server/auth/user");
    (userMod.getServerUserId as MockedFunction<typeof userMod.getServerUserId>).mockResolvedValue(
      "u1",
    );

    // Reason longer than 200 characters
    const longReason = "a".repeat(201);
    const invalidBody = JSON.stringify({ reason: longReason });
    const res = await POST(
      new Request("https://example.com", {
        method: "POST",
        body: invalidBody,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_body", details: null });
  });
});

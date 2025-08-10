import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("settings/sync/status route", () => {
  const mocks = vi.hoisted(() => ({ selects: [] as any[] }));

  beforeEach(() => {
    mocks.selects = [];
    vi.mock("@/server/auth/user", () => ({ getServerUserId: vi.fn().mockResolvedValue("user-1") }));
    vi.mock("@/server/db/client", () => ({
      db: {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockResolvedValue(mocks.selects.shift() ?? []),
              })),
              limit: vi.fn().mockResolvedValue(mocks.selects.shift() ?? []),
            })),
          })),
        })),
      },
    }));
  });

  afterEach(() => vi.resetModules());

  it("returns combined status data", async () => {
    // 1: userIntegrations (google connected)
    // 2: rawEvents gmail last
    // 3: rawEvents calendar last
    // 4: syncAudit gmail approve
    // 5: syncAudit calendar approve
    // 6: jobs queued count
    // 7: jobs done count
    // 8: jobs error count
    // 9: jobs last batch
    const now = new Date();
    mocks.selects.push([{ userId: "user-1", provider: "google" }]);
    mocks.selects.push([{ createdAt: now }]);
    mocks.selects.push([{ createdAt: now }]);
    mocks.selects.push([{ payload: { grantedScopes: ["scope1"] } }]);
    mocks.selects.push([{ payload: { grantedScopes: ["scope2"] } }]);
    mocks.selects.push([{ n: 1 }]);
    mocks.selects.push([{ n: 2 }]);
    mocks.selects.push([{ n: 0 }]);
    mocks.selects.push([{ batchId: "batch-1" }]);

    const mod = await import("./route");
    const res = await mod.GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.googleConnected).toBe(true);
    expect(json.lastSync.gmail).toBeDefined();
    expect(typeof json.jobs.queued).toBe("number");
    expect(typeof json.lastBatchId === "string" || json.lastBatchId === null).toBe(true);
  });
});

import { describe, it, expect, vi } from "vitest";

// 1) Mock the DB module BEFORE importing the code-under-test
vi.mock("@/server/db/client", () => {
  return {
    db: {
      execute: async (query: any) => {
        // Extract SQL from drizzle-orm query chunks
        const chunks = query?.queryChunks || [];
        const sqlParts = chunks
          .filter((chunk: any) => chunk?.value)
          .map((chunk: any) => chunk.value.join(""))
          .join(" ");

        // Simulate each query used by guardrails.ts
        if (sqlParts.includes("insert into ai_quotas")) {
          return { rows: [] };
        }
        if (sqlParts.includes("update ai_quotas")) {
          // pretend a credit was spent and 199 remain
          return { rows: [{ credits_left: 199 }] };
        }
        if (sqlParts.includes("count(*)::int as c")) {
          // per-minute count = 0
          return { rows: [{ c: 0 }] };
        }
        if (sqlParts.includes("coalesce(sum(cost_usd), 0)::numeric as sum")) {
          // today's cost = 0
          return { rows: [{ sum: 0 }] };
        }
        if (sqlParts.includes("insert into ai_usage")) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    },
  };
});

// 2) Now import the functions under test
import {
  firstOfMonth,
  ensureMonthlyQuota,
  trySpendCredit,
  checkRateLimit,
  underDailyCostCap,
  logUsage,
} from "../guardrails";

describe("env knobs", () => {
  it("has sane defaults", () => {
    expect(Number(process.env["AI_CREDITS_MONTHLY"] ?? 200)).toBeGreaterThan(0);
  });
});

describe("firstOfMonth", () => {
  it("returns day 1", () => {
    const d = new Date("2025-05-20T12:00:00Z");
    const f = firstOfMonth(d);
    expect(f.getDate()).toBe(1);
  });
});

describe("guardrails core", () => {
  const uid = "00000000-0000-0000-0000-000000000001";

  it("ensures monthly quota and spends a credit", async () => {
    await ensureMonthlyQuota(uid);
    const left = await trySpendCredit(uid);
    expect(left).toBe(199);
  });

  it("rate limit allows when count is low", async () => {
    const ok = await checkRateLimit(uid);
    expect(ok).toBe(true);
  });

  it("daily cap passes when cost is 0", async () => {
    const ok = await underDailyCostCap(uid);
    expect(ok).toBe(true);
  });

  it("logs usage without throwing", async () => {
    await expect(
      logUsage({
        userId: uid,
        model: "test-model",
        inputTokens: 1,
        outputTokens: 2,
        costUsd: 0.001,
      }),
    ).resolves.toBeUndefined();
  });
});

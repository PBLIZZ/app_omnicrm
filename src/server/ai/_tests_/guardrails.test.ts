import { describe, it, expect } from "vitest";
import { firstOfMonth } from "../guardrails"; // export it if you want to test

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

import { describe, it, expect } from "vitest";
import { chatRequestSchema } from "./schema";

describe("chat schema", () => {
  it("accepts valid prompt", () => {
    const parsed = chatRequestSchema.safeParse({ prompt: "hello" });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty prompt", () => {
    const parsed = chatRequestSchema.safeParse({ prompt: "" });
    expect(parsed.success).toBe(false);
  });
});

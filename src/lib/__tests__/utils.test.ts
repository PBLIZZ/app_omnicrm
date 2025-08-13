import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility", () => {
  it("combines classNames correctly", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  it("handles conditional classes", () => {
    const result = cn("base", true && "conditional", false && "not-included");
    expect(result).toBe("base conditional");
  });

  it("handles undefined and null", () => {
    const result = cn("base", undefined, null, "valid");
    expect(result).toBe("base valid");
  });

  it("merges conflicting Tailwind classes", () => {
    const result = cn("bg-red-500", "bg-blue-500");
    expect(result).toBe("bg-blue-500");
  });

  it("handles empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });
});

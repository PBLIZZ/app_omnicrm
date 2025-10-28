import { describe, it, expect } from "vitest";
import { AppError, ErrorHandler } from "../index";

describe("errors index exports", () => {
  it("re-exports AppError and ErrorHandler", () => {
    const err = new AppError("x", "CODE", "system", true);
    expect(err).toBeInstanceOf(Error);
    expect(typeof ErrorHandler.create).toBe("function");
  });
});
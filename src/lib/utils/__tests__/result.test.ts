import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  type Result,
} from "../result";

describe("Result utility", () => {
  describe("ok", () => {
    it("should create a success result", () => {
      const result = ok(42);

      expect(result).toEqual({ success: true, data: 42 });
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);
    });

    it("should create success result with any type", () => {
      const stringResult = ok("success");
      const objectResult = ok({ value: 100 });
      const arrayResult = ok([1, 2, 3]);

      expect(isOk(stringResult)).toBe(true);
      expect(isOk(objectResult)).toBe(true);
      expect(isOk(arrayResult)).toBe(true);
    });
  });

  describe("err", () => {
    it("should create an error result", () => {
      const result = err(new Error("Failed"));

      expect(result).toEqual({ success: false, error: expect.any(Error) });
      expect(isErr(result)).toBe(true);
      expect(isOk(result)).toBe(false);
    });

    it("should create error result with custom error types", () => {
      const stringError = err("error string");
      const objectError = err({ code: 500, message: "Server error" });

      expect(isErr(stringError)).toBe(true);
      expect(isErr(objectError)).toBe(true);
    });
  });

  describe("unwrap", () => {
    it("should extract data from success result", () => {
      const result = ok(42);
      const value = unwrap(result);

      expect(value).toBe(42);
    });

    it("should throw error from error result", () => {
      const result = err(new Error("Failed"));

      expect(() => unwrap(result)).toThrow("Failed");
    });
  });

  describe("unwrapOr", () => {
    it("should return data from success result", () => {
      const result = ok(42);
      const value = unwrapOr(result, 0);

      expect(value).toBe(42);
    });

    it("should return default value from error result", () => {
      const result: Result<number, Error> = err(new Error("Failed"));
      const value = unwrapOr(result, 0);

      expect(value).toBe(0);
    });
  });

  describe("map", () => {
    it("should transform success result", () => {
      const result = ok(42);
      const mapped = map(result, (n) => n * 2);

      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe(84);
      }
    });

    it("should not transform error result", () => {
      const result: Result<number, Error> = err(new Error("Failed"));
      const mapped = map(result, (n) => n * 2);

      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBeInstanceOf(Error);
      }
    });
  });

  describe("Real-world scenarios", () => {
    function divide(a: number, b: number): Result<number, string> {
      if (b === 0) {
        return err("Division by zero");
      }
      return ok(a / b);
    }

    it("should handle division success", () => {
      const result = divide(10, 2);

      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBe(5);
    });

    it("should handle division by zero", () => {
      const result = divide(10, 0);

      expect(isErr(result)).toBe(true);
      expect(unwrapOr(result, 0)).toBe(0);
    });
  });
});
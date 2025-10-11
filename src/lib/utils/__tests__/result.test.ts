import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  flatMap,
  safeAsync,
  safe,
  all,
  any,
  dbError,
  apiError,
  validationError,
  type Result,
} from "../result";

describe("Result Type Utilities", () => {
  describe("ok and err constructors", () => {
    it("should create success result with ok()", () => {
      const result = ok(42);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it("should create error result with err()", () => {
      const error = new Error("Something went wrong");
      const result = err(error);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });

    it("should work with various data types", () => {
      expect(ok("string").success).toBe(true);
      expect(ok(123).success).toBe(true);
      expect(ok(true).success).toBe(true);
      expect(ok({ key: "value" }).success).toBe(true);
      expect(ok([1, 2, 3]).success).toBe(true);
      expect(ok(null).success).toBe(true);
    });
  });

  describe("type guards", () => {
    it("should correctly identify success results with isOk()", () => {
      const successResult = ok(42);
      const errorResult = err(new Error("fail"));

      expect(isOk(successResult)).toBe(true);
      expect(isOk(errorResult)).toBe(false);
    });

    it("should correctly identify error results with isErr()", () => {
      const successResult = ok(42);
      const errorResult = err(new Error("fail"));

      expect(isErr(successResult)).toBe(false);
      expect(isErr(errorResult)).toBe(true);
    });

    it("should provide type narrowing for success", () => {
      const result = ok(42);
      if (isOk(result)) {
        // TypeScript should know result.data exists here
        expect(result.data).toBe(42);
      }
    });

    it("should provide type narrowing for error", () => {
      const error = new Error("test");
      const result = err(error);
      if (isErr(result)) {
        // TypeScript should know result.error exists here
        expect(result.error).toBe(error);
      }
    });
  });

  describe("unwrap utilities", () => {
    it("should unwrap success value", () => {
      const result = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it("should throw error when unwrapping error result", () => {
      const error = new Error("test error");
      const result = err(error);
      expect(() => unwrap(result)).toThrow("test error");
    });

    it("should return default value with unwrapOr() for error", () => {
      const result = err(new Error("fail"));
      expect(unwrapOr(result, 99)).toBe(99);
    });

    it("should return actual value with unwrapOr() for success", () => {
      const result = ok(42);
      expect(unwrapOr(result, 99)).toBe(42);
    });
  });

  describe("map operations", () => {
    it("should transform success value with map()", () => {
      const result = ok(5);
      const doubled = map(result, (x) => x * 2);

      expect(doubled.success).toBe(true);
      if (doubled.success) {
        expect(doubled.data).toBe(10);
      }
    });

    it("should not transform error with map()", () => {
      const error = new Error("original");
      const result = err(error);
      const mapped = map(result, (x: number) => x * 2);

      expect(mapped.success).toBe(false);
      if (!mapped.success) {
        expect(mapped.error).toBe(error);
      }
    });

    it("should transform error with mapErr()", () => {
      const result = err(new Error("original"));
      const mapped = mapErr(result, (e) => new Error(`Wrapped: ${e.message}`));

      expect(mapped.success).toBe(false);
      if (!mapped.success) {
        expect(mapped.error.message).toBe("Wrapped: original");
      }
    });

    it("should not transform success with mapErr()", () => {
      const result = ok(42);
      const mapped = mapErr(result, (e: Error) => new Error(`Wrapped: ${e.message}`));

      expect(mapped.success).toBe(true);
      if (mapped.success) {
        expect(mapped.data).toBe(42);
      }
    });
  });

  describe("flatMap chaining", () => {
    it("should chain successful operations", () => {
      const result = ok(5);
      const chained = flatMap(result, (x) => ok(x * 2));

      expect(chained.success).toBe(true);
      if (chained.success) {
        expect(chained.data).toBe(10);
      }
    });

    it("should short-circuit on first error", () => {
      const result = ok(5);
      const chained = flatMap(result, () => err(new Error("calculation failed")));

      expect(chained.success).toBe(false);
      if (!chained.success) {
        expect(chained.error.message).toBe("calculation failed");
      }
    });

    it("should not execute flatMap on error result", () => {
      const error = new Error("initial");
      const result = err(error);
      let executed = false;

      const chained = flatMap(result, () => {
        executed = true;
        return ok(99);
      });

      expect(executed).toBe(false);
      expect(chained.success).toBe(false);
    });
  });

  describe("safeAsync wrapper", () => {
    it("should convert successful async function to Result", async () => {
      const asyncFn = async (x: number) => x * 2;
      const safeFn = safeAsync(asyncFn);

      const result = await safeFn(5);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(10);
      }
    });

    it("should catch thrown errors and return error Result", async () => {
      const asyncFn = async () => {
        throw new Error("async error");
      };
      const safeFn = safeAsync(asyncFn);

      const result = await safeFn();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("async error");
      }
    });

    it("should handle non-Error throws", async () => {
      const asyncFn = async () => {
        throw "string error";
      };
      const safeFn = safeAsync(asyncFn);

      const result = await safeFn();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it("should preserve function arguments", async () => {
      const asyncFn = async (a: number, b: string) => `${a}-${b}`;
      const safeFn = safeAsync(asyncFn);

      const result = await safeFn(42, "test");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("42-test");
      }
    });
  });

  describe("safe wrapper (sync)", () => {
    it("should convert successful function to Result", () => {
      const fn = (x: number) => x * 2;
      const safeFn = safe(fn);

      const result = safeFn(5);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(10);
      }
    });

    it("should catch thrown errors and return error Result", () => {
      const fn = () => {
        throw new Error("sync error");
      };
      const safeFn = safe(fn);

      const result = safeFn();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("sync error");
      }
    });

    it("should handle non-Error throws", () => {
      const fn = () => {
        throw "string error";
      };
      const safeFn = safe(fn);

      const result = safeFn();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe("all combinator", () => {
    it("should combine multiple successes into array", () => {
      const results = [ok(1), ok(2), ok(3)];
      const combined = all(results);

      expect(combined.success).toBe(true);
      if (combined.success) {
        expect(combined.data).toEqual([1, 2, 3]);
      }
    });

    it("should return first error if any result fails", () => {
      const error1 = new Error("error1");
      const error2 = new Error("error2");
      const results = [ok(1), err(error1), err(error2)];
      const combined = all(results);

      expect(combined.success).toBe(false);
      if (!combined.success) {
        expect(combined.error).toBe(error1);
      }
    });

    it("should handle empty array", () => {
      const results: Result<number, Error>[] = [];
      const combined = all(results);

      expect(combined.success).toBe(true);
      if (combined.success) {
        expect(combined.data).toEqual([]);
      }
    });
  });

  describe("any combinator", () => {
    it("should return first success", () => {
      const results = [err(new Error("e1")), ok(42), ok(99)];
      const combined = any(results);

      expect(combined.success).toBe(true);
      if (combined.success) {
        expect(combined.data).toBe(42);
      }
    });

    it("should return all errors if all fail", () => {
      const error1 = new Error("e1");
      const error2 = new Error("e2");
      const results = [err(error1), err(error2)];
      const combined = any(results);

      expect(combined.success).toBe(false);
      if (!combined.success) {
        expect(combined.error).toEqual([error1, error2]);
      }
    });

    it("should handle empty array", () => {
      const results: Result<number, Error>[] = [];
      const combined = any(results);

      expect(combined.success).toBe(false);
      if (!combined.success) {
        expect(combined.error).toEqual([]);
      }
    });
  });

  describe("specialized error constructors", () => {
    it("should create database error with dbError()", () => {
      const result = dbError("DB_QUERY_FAILED", "Query timeout", { query: "SELECT *" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_QUERY_FAILED");
        expect(result.error.message).toBe("Query timeout");
        expect(result.error.details).toEqual({ query: "SELECT *" });
      }
    });

    it("should create API error with apiError()", () => {
      const result = apiError(404, "Not found", "RESOURCE_NOT_FOUND", { id: "123" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(404);
        expect(result.error.message).toBe("Not found");
        expect(result.error.code).toBe("RESOURCE_NOT_FOUND");
        expect(result.error.details).toEqual({ id: "123" });
      }
    });

    it("should create validation error with validationError()", () => {
      const result = validationError("Invalid email format", "INVALID_EMAIL", "email");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Invalid email format");
        expect(result.error.code).toBe("INVALID_EMAIL");
        expect(result.error.field).toBe("email");
      }
    });
  });

  describe("real-world scenarios", () => {
    it("should chain database operations with error handling", () => {
      const fetchUser = (id: string): Result<{ id: string; name: string }, Error> => {
        if (id === "invalid") return err(new Error("User not found"));
        return ok({ id, name: "John Doe" });
      };

      const fetchUserPosts = (
        userId: string,
      ): Result<Array<{ title: string }>, Error> => {
        if (userId === "error") return err(new Error("Posts fetch failed"));
        return ok([{ title: "Post 1" }, { title: "Post 2" }]);
      };

      // Success case
      const successResult = flatMap(fetchUser("user-123"), (user) =>
        map(fetchUserPosts(user.id), (posts) => ({ user, posts })),
      );

      expect(successResult.success).toBe(true);

      // Error case
      const errorResult = flatMap(fetchUser("invalid"), (user) =>
        map(fetchUserPosts(user.id), (posts) => ({ user, posts })),
      );

      expect(errorResult.success).toBe(false);
    });

    it("should validate and process user input", () => {
      const validateEmail = (email: string): Result<string, Error> => {
        if (!email.includes("@")) {
          return err(new Error("Invalid email"));
        }
        return ok(email.toLowerCase());
      };

      const validateAge = (age: number): Result<number, Error> => {
        if (age < 0 || age > 120) {
          return err(new Error("Invalid age"));
        }
        return ok(age);
      };

      // Valid inputs
      const validEmail = validateEmail("test@example.com");
      const validAge = validateAge(25);
      const combined = all([validEmail, validAge]);

      expect(combined.success).toBe(true);

      // Invalid inputs
      const invalidEmail = validateEmail("not-an-email");
      const validAge2 = validateAge(25);
      const combinedInvalid = all([invalidEmail, validAge2]);

      expect(combinedInvalid.success).toBe(false);
    });
  });
});
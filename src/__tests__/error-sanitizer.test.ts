/**
 * Error Sanitization Tests
 *
 * Tests the error sanitization utilities to ensure sensitive information
 * is properly filtered from error messages and responses.
 */

import { describe, it, expect } from "vitest";
import {
  sanitizeErrorMessage,
  createSanitizedErrorResponse,
  shouldLogErrorDetails,
  extractSafeErrorDetails,
  getEnvironmentSafeErrorMessage,
} from "@/server/lib/error-sanitizer";
import { AppError } from "@/lib/errors/app-error";

describe("Error Sanitization", () => {
  describe("sanitizeErrorMessage", () => {
    it("should sanitize password-related errors", () => {
      const error = new Error("Invalid password for user admin");
      const result = sanitizeErrorMessage(error);
      expect(result).toBe("An unexpected error occurred. Please try again.");
    });

    it("should sanitize token-related errors", () => {
      const error = new Error("Invalid JWT token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      const result = sanitizeErrorMessage(error);
      expect(result).toBe("An unexpected error occurred. Please try again.");
    });

    it("should sanitize database-related errors", () => {
      const error = new Error(
        "Connection failed to database: postgresql://user:pass@localhost:5432/db",
      );
      const result = sanitizeErrorMessage(error);
      expect(result).toBe("An unexpected error occurred. Please try again.");
    });

    it("should sanitize file path errors", () => {
      const error = new Error("Cannot access file: /etc/passwd");
      const result = sanitizeErrorMessage(error);
      expect(result).toBe("An unexpected error occurred. Please try again.");
    });

    it("should sanitize stack trace patterns", () => {
      const error = new Error("Error: at User.login (/app/src/auth.js:45:12)");
      const result = sanitizeErrorMessage(error);
      expect(result).toBe("An unexpected error occurred. Please try again.");
    });

    it("should allow safe validation errors", () => {
      const error = new Error("Validation failed: email is required");
      error.name = "ValidationError";
      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Validation failed: email is required");
    });

    it("should allow ZodError messages", () => {
      const error = new Error("Invalid input: name must be a string");
      error.name = "ZodError";
      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Invalid input: name must be a string");
    });

    it("should handle AppError messages safely", () => {
      const error = new AppError("User not found", "USER_NOT_FOUND", "validation", false);
      const result = sanitizeErrorMessage(error);
      expect(result).toBe("User not found");
    });

    it("should handle non-Error objects", () => {
      const result = sanitizeErrorMessage("Some string error");
      expect(result).toBe("An unexpected error occurred. Please try again.");
    });
  });

  describe("createSanitizedErrorResponse", () => {
    it("should create sanitized response for AppError", () => {
      const error = new AppError("User not found", "USER_NOT_FOUND", "validation", false);
      const context = { operation: "test", userId: "user123" };
      const result = createSanitizedErrorResponse(error, context);

      expect(result).toEqual({
        message: "User not found",
        code: "USER_NOT_FOUND",
        category: "validation",
        timestamp: expect.any(String),
        requestId: undefined,
      });
    });

    it("should create sanitized response for sensitive errors", () => {
      const error = new Error("Database connection failed: postgresql://user:pass@localhost");
      const context = { operation: "test", userId: "user123" };
      const result = createSanitizedErrorResponse(error, context);

      expect(result.message).toBe("An unexpected error occurred. Please try again.");
      expect(result.code).toMatch(/^ERR_\d+_[a-z0-9]+$/);
      expect(result.category).toBe("system");
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should include requestId when provided", () => {
      const error = new Error("Test error");
      const context = { operation: "test", requestId: "req123" };
      const result = createSanitizedErrorResponse(error, context);

      expect(result.requestId).toBe("req123");
    });
  });

  describe("shouldLogErrorDetails", () => {
    it("should allow logging of AppError details", () => {
      const error = new AppError("User not found", "USER_NOT_FOUND", "validation", false);
      expect(shouldLogErrorDetails(error)).toBe(true);
    });

    it("should prevent logging of password-related errors", () => {
      const error = new Error("Invalid password for user admin");
      expect(shouldLogErrorDetails(error)).toBe(false);
    });

    it("should prevent logging of token-related errors", () => {
      const error = new Error("Invalid JWT token");
      expect(shouldLogErrorDetails(error)).toBe(false);
    });

    it("should allow logging of safe errors", () => {
      const error = new Error("Validation failed: email is required");
      expect(shouldLogErrorDetails(error)).toBe(true);
    });

    it("should allow logging of non-Error objects", () => {
      expect(shouldLogErrorDetails("Some error")).toBe(true);
    });
  });

  describe("extractSafeErrorDetails", () => {
    it("should extract AppError details safely", () => {
      const error = new AppError("User not found", "USER_NOT_FOUND", "validation", false);
      const result = extractSafeErrorDetails(error);

      expect(result).toEqual({
        name: "AppError",
        code: "USER_NOT_FOUND",
        category: "validation",
        retryable: false,
        message: "User not found",
        stack: expect.any(String),
      });
    });

    it("should extract Error details safely", () => {
      const error = new Error("Test error");
      const result = extractSafeErrorDetails(error);

      expect(result).toEqual({
        name: "Error",
        message: "Test error",
        stack: expect.any(String),
      });
    });

    it("should handle non-Error objects", () => {
      const result = extractSafeErrorDetails("Some error");

      expect(result).toEqual({
        type: "string",
        value: "Some error",
      });
    });
  });

  describe("getEnvironmentSafeErrorMessage", () => {
    it("should return detailed message in development", () => {
      const error = new Error("Database connection failed");
      const result = getEnvironmentSafeErrorMessage(error, true);
      expect(result).toBe("Database connection failed");
    });

    it("should sanitize message in production", () => {
      const error = new Error("Database connection failed: postgresql://user:pass@localhost");
      const result = getEnvironmentSafeErrorMessage(error, false);
      expect(result).toBe("An unexpected error occurred. Please try again.");
    });

    it("should handle non-Error objects", () => {
      const result = getEnvironmentSafeErrorMessage("Some error", false);
      expect(result).toBe("An unexpected error occurred. Please try again.");
    });
  });
});

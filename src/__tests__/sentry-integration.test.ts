/**
 * Sentry Integration Tests
 *
 * Tests the Sentry error tracking integration with the structured logger.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "@/server/lib/structured-logger";
import * as Sentry from "@/lib/sentry";

// Mock Sentry functions
vi.mock("@/lib/sentry", () => ({
  captureError: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

describe("Sentry Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Error Logging Integration", () => {
    it("should capture errors in Sentry when logging error level", () => {
      const error = new Error("Test error");
      const context = {
        operation: "test_operation",
        endpoint: "/api/test",
        userId: "test-user-123",
      };

      logger.error("Test error message", context, error);

      expect(Sentry.captureError).toHaveBeenCalledWith(error, context);
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        "Test error message",
        "test_operation",
        "error",
        expect.objectContaining(context),
      );
    });

    it("should capture fatal errors in Sentry", () => {
      const error = new Error("Fatal error");
      const context = {
        operation: "critical_operation",
        userId: "test-user-123",
      };

      logger.fatal("Fatal error message", context, error);

      expect(Sentry.captureError).toHaveBeenCalledWith(error, context);
    });

    it("should capture error messages without error objects", () => {
      const context = {
        operation: "test_operation",
        endpoint: "/api/test",
      };

      logger.error("Error message without error object", context);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Error message without error object",
        "error",
        context,
      );
    });
  });

  describe("Warning Logging Integration", () => {
    it("should capture warnings in Sentry", () => {
      const context = {
        operation: "warning_operation",
        endpoint: "/api/warning",
      };

      logger.warn("Warning message", context);

      expect(Sentry.captureMessage).toHaveBeenCalledWith("Warning message", "warning", context);
    });
  });

  describe("Info and Debug Logging", () => {
    it("should add breadcrumbs for info messages", () => {
      const context = {
        operation: "info_operation",
        userId: "test-user-123",
      };

      logger.info("Info message", context);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        "Info message",
        "info_operation",
        "info",
        expect.objectContaining(context),
      );
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it("should add breadcrumbs for debug messages", () => {
      const context = {
        operation: "debug_operation",
      };

      logger.debug("Debug message", context);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        "Debug message",
        "debug_operation",
        "debug",
        expect.objectContaining(context),
      );
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });

  describe("API Request/Response Logging", () => {
    it("should add breadcrumbs for API requests", () => {
      const context = {
        operation: "api_request",
        endpoint: "/api/contacts",
        userId: "test-user-123",
      };

      logger.logApiRequest("GET", "/api/contacts", context);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        "GET /api/contacts",
        "api_request",
        "info",
        expect.objectContaining({
          ...context,
          endpoint: "/api/contacts",
          method: "GET",
        }),
      );
    });

    it("should capture API errors in Sentry", () => {
      const error = new Error("API error");
      const context = {
        operation: "api_response",
        endpoint: "/api/contacts",
        userId: "test-user-123",
      };

      logger.logApiResponse("GET", "/api/contacts", 500, 1000, context, error);

      expect(Sentry.captureError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          ...context,
          endpoint: "/api/contacts",
          method: "GET",
          duration: 1000,
          statusCode: 500,
        }),
      );
    });
  });

  describe("Database Operation Logging", () => {
    it("should add breadcrumbs for database operations", () => {
      const context = {
        operation: "database",
        table: "contacts",
        userId: "test-user-123",
      };

      logger.logDatabaseOperation("INSERT", "contacts", context);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        "Database INSERT on contacts",
        "database",
        "info",
        expect.objectContaining({
          ...context,
          table: "contacts",
        }),
      );
    });
  });

  describe("Authentication Event Logging", () => {
    it("should add breadcrumbs for auth events", () => {
      const context = {
        operation: "authentication",
        event: "login",
        userId: "test-user-123",
      };

      logger.logAuthEvent("login", context);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        "Auth event: login",
        "authentication",
        "info",
        expect.objectContaining({
          ...context,
          event: "login",
        }),
      );
    });
  });

  describe("Security Event Logging", () => {
    it("should capture security events in Sentry", () => {
      const context = {
        operation: "security",
        event: "suspicious_activity",
        userId: "test-user-123",
      };

      logger.logSecurityEvent("suspicious_activity", context);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Security event: suspicious_activity",
        "warning",
        expect.objectContaining({
          ...context,
          event: "suspicious_activity",
        }),
      );
    });
  });
});

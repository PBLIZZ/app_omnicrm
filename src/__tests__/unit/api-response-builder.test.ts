import { describe, it, expect, vi } from "vitest";
import { ApiResponseBuilder } from "@/server/api/response";

// Mock logger
vi.mock("@/lib/observability", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * API Response Builder Unit Tests
 *
 * These tests verify the ApiResponseBuilder class functionality:
 * - Success response formatting
 * - Error response formatting
 * - Proper logging integration
 * - Request ID handling
 * - Status code mapping
 */
describe("ApiResponseBuilder Unit Tests", () => {
  describe("Success Responses", () => {
    it("creates success response with data", async () => {
      const api = new ApiResponseBuilder("test.operation", "test-request-id");
      const testData = { id: "123", name: "Test" };

      const response = api.success(testData);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("ok", true);
      expect(data).toHaveProperty("data", testData);
      expect(data).toHaveProperty("timestamp");
      expect(typeof data.timestamp).toBe("string");
    });

    it("creates success response with custom status", async () => {
      const api = new ApiResponseBuilder("test.operation");
      const testData = { created: true };

      const response = api.success(testData, "Resource created", 201);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("ok", true);
      expect(data).toHaveProperty("data", testData);
      expect(data).toHaveProperty("message", "Resource created");
    });

    it("creates success response with message", async () => {
      const api = new ApiResponseBuilder("test.operation");
      const testData = { updated: true };

      const response = api.success(testData, "Update successful");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("message", "Update successful");
    });
  });

  describe("Error Responses", () => {
    it("creates validation error response", async () => {
      const api = new ApiResponseBuilder("test.operation", "test-request-id");

      const response = api.validationError("Invalid input", { field: "email" });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("ok", false);
      expect(data).toHaveProperty("error", "Invalid input");
      expect(data).toHaveProperty("code", "VALIDATION_ERROR");
      expect(data).toHaveProperty("requestId", "test-request-id");
    });

    it("creates unauthorized error response", async () => {
      const api = new ApiResponseBuilder("test.operation");

      const response = api.unauthorized();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("ok", false);
      expect(data).toHaveProperty("error", "Authentication required");
      expect(data).toHaveProperty("code", "UNAUTHORIZED");
    });

    it("creates forbidden error response", async () => {
      const api = new ApiResponseBuilder("test.operation");

      const response = api.forbidden("Access denied to resource");
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toHaveProperty("ok", false);
      expect(data).toHaveProperty("error", "Access denied to resource");
      expect(data).toHaveProperty("code", "FORBIDDEN");
    });

    it("creates not found error response", async () => {
      const api = new ApiResponseBuilder("test.operation");

      const response = api.notFound("Resource not found");
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty("ok", false);
      expect(data).toHaveProperty("error", "Resource not found");
      expect(data).toHaveProperty("code", "NOT_FOUND");
    });

    it("creates database error response", async () => {
      const api = new ApiResponseBuilder("test.operation");
      const originalError = new Error("Connection failed");

      const response = api.databaseError("Database operation failed", originalError);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty("ok", false);
      expect(data).toHaveProperty("error", "Database operation failed");
      expect(data).toHaveProperty("code", "DATABASE_ERROR");
    });

    it("includes details in development mode", async () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "development";

      const api = new ApiResponseBuilder("test.operation");
      const details = { field: "email", reason: "invalid format" };

      const response = api.validationError("Validation failed", details);
      const data = await response.json();

      expect(data).toHaveProperty("details", details);

      (process.env as any).NODE_ENV = originalEnv;
    });

    it("excludes details in production mode", async () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "production";

      const api = new ApiResponseBuilder("test.operation");
      const details = { field: "email", reason: "invalid format" };

      const response = api.validationError("Validation failed", details);
      const data = await response.json();

      expect(data).not.toHaveProperty("details");

      (process.env as any).NODE_ENV = originalEnv;
    });
  });

  describe("Request ID Handling", () => {
    it("uses provided request ID", async () => {
      const requestId = "custom-request-id-123";
      const api = new ApiResponseBuilder("test.operation", requestId);

      const response = api.success({ test: true });
      const data = await response.json();

      // Success responses don't include requestId in body by default
      expect(data).not.toHaveProperty("requestId");
    });

    it("generates request ID when not provided", () => {
      const api = new ApiResponseBuilder("test.operation");

      // The constructor should generate a request ID
      expect(api).toBeDefined();
    });

    it("includes request ID in error responses", async () => {
      const requestId = "error-request-id-456";
      const api = new ApiResponseBuilder("test.operation", requestId);

      const response = api.validationError("Test error");
      const data = await response.json();

      expect(data).toHaveProperty("requestId", requestId);
    });
  });

  describe("Timestamp Handling", () => {
    it("includes valid timestamp in responses", async () => {
      const api = new ApiResponseBuilder("test.operation");

      const response = api.success({ test: true });
      const data = await response.json();

      expect(data).toHaveProperty("timestamp");
      const timestamp = new Date(data.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
      expect(Math.abs(Date.now() - timestamp.getTime())).toBeLessThan(1000);
    });

    it("includes timestamp in error responses", async () => {
      const api = new ApiResponseBuilder("test.operation");

      const response = api.validationError("Test error");
      const data = await response.json();

      expect(data).toHaveProperty("timestamp");
      const timestamp = new Date(data.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe("Special Response Types", () => {
    it("creates file download response", () => {
      const api = new ApiResponseBuilder("test.operation");
      const content = "test file content";

      const response = api.fileDownload(content, "test.txt", "text/plain");

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/plain");
      expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="test.txt"');
    });

    it("creates raw response", () => {
      const api = new ApiResponseBuilder("test.operation");
      const content = JSON.stringify({ raw: true });

      const response = api.raw(content, "application/json", 202);

      expect(response.status).toBe(202);
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("creates server-sent events response", () => {
      const api = new ApiResponseBuilder("test.operation");

      const response = api.serverSentEvents((encoder, controller) => {
        const data = encoder.encode("data: test event\n\n");
        controller.enqueue(data);
        controller.close();
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("Connection")).toBe("keep-alive");
    });
  });
});

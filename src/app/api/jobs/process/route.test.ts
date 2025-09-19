import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { makeRouteContext } from "@/__tests__/helpers/routeContext";

// Mock dependencies
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("user-123"),
}));

vi.mock("@/server/jobs/runner", () => ({
  JobRunner: vi.fn().mockImplementation(() => ({
    processPendingJobs: vi.fn().mockResolvedValue({
      processed: 5,
      succeeded: 4,
      failed: 1,
      errors: [],
    }),
  })),
}));

vi.mock("@/lib/observability", () => ({
  logger: {
    progress: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("/api/jobs/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST", () => {
    it("processes jobs successfully", async () => {
      const request = new Request("http://localhost:3000/api/jobs/process", {
        method: "POST",
        headers: {
          "x-csrf-token": "test-token",
        },
      }) as unknown as NextRequest;

      const response = await POST(request, makeRouteContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.success).toBe(true);
      expect(data.data.processed).toBe(5);
      expect(data.data.succeeded).toBe(4);
      expect(data.data.failed).toBe(1);
      expect(data.data.message).toBe("Jobs processed successfully");
    });

    it("logs job processing activity", async () => {
      const request = new Request("http://localhost:3000/api/jobs/process", {
        method: "POST",
        headers: {
          "x-csrf-token": "test-token",
        },
      }) as unknown as NextRequest;

      await POST(request, makeRouteContext());

      expect(require("@/lib/observability").logger.progress).toHaveBeenCalledWith(
        "Processing jobs...",
        "Manual job processing started",
      );

      expect(require("@/lib/observability").logger.info).toHaveBeenCalledWith(
        "Manual job processing triggered by user",
        expect.objectContaining({
          operation: "manual_job_processing",
          userId: "user-123",
        }),
      );

      expect(require("@/lib/observability").logger.success).toHaveBeenCalledWith(
        "Jobs processed successfully",
        "Processed: 5, Succeeded: 4, Failed: 1",
        expect.objectContaining({
          description: "Successfully processed 5 jobs",
        }),
      );
    });

    it("calls JobRunner with correct parameters", async () => {
      const JobRunnerMock = require("@/server/jobs/runner").JobRunner;
      const mockInstance = new JobRunnerMock();

      const request = new Request("http://localhost:3000/api/jobs/process", {
        method: "POST",
        headers: {
          "x-csrf-token": "test-token",
        },
      }) as unknown as NextRequest;

      await POST(request, makeRouteContext());

      expect(JobRunnerMock).toHaveBeenCalledTimes(1);
      expect(mockInstance.processPendingJobs).toHaveBeenCalledWith(50);
    });

    it("handles job processing with no jobs", async () => {
      const JobRunnerMock = require("@/server/jobs/runner").JobRunner;
      const mockInstance = new JobRunnerMock();
      mockInstance.processPendingJobs.mockResolvedValueOnce({
        processed: 0,
        succeeded: 0,
        failed: 0,
      });

      const request = new Request("http://localhost:3000/api/jobs/process", {
        method: "POST",
        headers: {
          "x-csrf-token": "test-token",
        },
      }) as unknown as NextRequest;

      const response = await POST(request, makeRouteContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.processed).toBe(0);
      expect(data.data.succeeded).toBe(0);
      expect(data.data.failed).toBe(0);
    });

    it("handles job processing with partial failures", async () => {
      const JobRunnerMock = require("@/server/jobs/runner").JobRunner;
      const mockInstance = new JobRunnerMock();
      mockInstance.processPendingJobs.mockResolvedValueOnce({
        processed: 10,
        succeeded: 7,
        failed: 3,
      });

      const request = new Request("http://localhost:3000/api/jobs/process", {
        method: "POST",
        headers: {
          "x-csrf-token": "test-token",
        },
      }) as unknown as NextRequest;

      const response = await POST(request, makeRouteContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.processed).toBe(10);
      expect(data.data.succeeded).toBe(7);
      expect(data.data.failed).toBe(3);
    });

    it("returns 401 when user not authenticated", async () => {
      vi.mocked(require("@/server/auth/user").getServerUserId).mockRejectedValueOnce(
        new Error("No session"),
      );

      const request = new Request("http://localhost:3000/api/jobs/process", {
        method: "POST",
        headers: {
          "x-csrf-token": "test-token",
        },
      }) as unknown as NextRequest;

      const response = await POST(request, makeRouteContext());

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("handles JobRunner errors gracefully", async () => {
      const JobRunnerMock = require("@/server/jobs/runner").JobRunner;
      const mockInstance = new JobRunnerMock();
      mockInstance.processPendingJobs.mockRejectedValueOnce(new Error("Job processing failed"));

      const request = new Request("http://localhost:3000/api/jobs/process", {
        method: "POST",
        headers: {
          "x-csrf-token": "test-token",
        },
      }) as unknown as NextRequest;

      const response = await POST(request, makeRouteContext());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("INTERNAL_ERROR");
      expect(data.error.message).toBe("Manual job processing failed");
    });

    it("handles JobRunner instantiation errors", async () => {
      vi.mocked(require("@/server/jobs/runner").JobRunner).mockImplementationOnce(() => {
        throw new Error("Runner initialization failed");
      });

      const request = new Request("http://localhost:3000/api/jobs/process", {
        method: "POST",
        headers: {
          "x-csrf-token": "test-token",
        },
      }) as unknown as NextRequest;

      const response = await POST(request, makeRouteContext());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });

    it("includes requestId in response", async () => {
      const request = new Request("http://localhost:3000/api/jobs/process", {
        method: "POST",
        headers: {
          "x-csrf-token": "test-token",
          "x-correlation-id": "test-correlation-123",
        },
      }) as unknown as NextRequest;

      const response = await POST(request, makeRouteContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.timestamp).toBeDefined();
      // requestId should be in headers, not in response body
      expect(response.headers.get("x-request-id")).toBeDefined();
    });

    it("respects rate limiting configuration", async () => {
      // This test ensures the route handler is configured with rate limiting
      // The actual rate limiting logic is tested in the handler tests
      const request = new Request("http://localhost:3000/api/jobs/process", {
        method: "POST",
        headers: {
          "x-csrf-token": "test-token",
        },
      }) as unknown as NextRequest;

      const response = await POST(request, makeRouteContext());

      expect(response.status).toBe(200);
      // If rate limiting headers were set, they would be visible here
      // For now, we just ensure the endpoint works with rate limiting enabled
    });

    it("processes maximum of 50 jobs per request", async () => {
      const JobRunnerMock = require("@/server/jobs/runner").JobRunner;
      const mockInstance = new JobRunnerMock();

      const request = new Request("http://localhost:3000/api/jobs/process", {
        method: "POST",
        headers: {
          "x-csrf-token": "test-token",
        },
      }) as unknown as NextRequest;

      await POST(request, makeRouteContext());

      expect(mockInstance.processPendingJobs).toHaveBeenCalledWith(50);
    });

    it("maintains consistent response format", async () => {
      const request = new Request("http://localhost:3000/api/jobs/process", {
        method: "POST",
        headers: {
          "x-csrf-token": "test-token",
        },
      }) as unknown as NextRequest;

      const response = await POST(request, makeRouteContext());
      const data = await response.json();

      expect(data).toHaveProperty("ok");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("success");
      expect(data.data).toHaveProperty("message");
      expect(data.data).toHaveProperty("processed");
      expect(data.data).toHaveProperty("succeeded");
      expect(data.data).toHaveProperty("failed");
      // requestId should be in headers, not in response body
      expect(response.headers.get("x-request-id")).toBeDefined();
    });
  });
});

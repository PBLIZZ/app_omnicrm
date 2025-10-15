/**
 * Jobs Schemas Tests
 */

import { describe, it, expect } from "vitest";
import {
  CronJobInputSchema,
  CronJobResultSchema,
  SimpleJobProcessSchema,
  JobProcessingResultSchema,
  JobStatusDataSchema,
} from "../jobs";

describe("Jobs Schemas", () => {
  describe("CronJobInputSchema", () => {
    it("should validate empty object", () => {
      const result = CronJobInputSchema.parse({});
      expect(result).toEqual({});
    });

    it("should ignore extra fields", () => {
      const result = CronJobInputSchema.parse({ extra: "field" });
      expect(result).toBeDefined();
    });
  });

  describe("CronJobResultSchema", () => {
    it("should validate successful result", () => {
      const input = {
        success: true,
        message: "Jobs processed successfully",
        processed: 10,
        failed: 0,
      };
      const result = CronJobResultSchema.parse(input);
      expect(result.success).toBe(true);
      expect(result.processed).toBe(10);
      expect(result.failed).toBe(0);
    });

    it("should validate failed result with error", () => {
      const input = {
        success: false,
        message: "Processing failed",
        processed: 5,
        failed: 3,
        error: "Database connection timeout",
      };
      const result = CronJobResultSchema.parse(input);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection timeout");
    });

    it("should require all mandatory fields", () => {
      const input = { success: true, message: "test" };
      expect(() => CronJobResultSchema.parse(input)).toThrow();
    });

    it("should accept zero values", () => {
      const input = {
        success: true,
        message: "No jobs to process",
        processed: 0,
        failed: 0,
      };
      const result = CronJobResultSchema.parse(input);
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe("SimpleJobProcessSchema", () => {
    it("should validate without maxJobs", () => {
      const result = SimpleJobProcessSchema.parse({});
      expect(result.maxJobs).toBeUndefined();
    });

    it("should validate with maxJobs", () => {
      const input = { maxJobs: 50 };
      const result = SimpleJobProcessSchema.parse(input);
      expect(result.maxJobs).toBe(50);
    });

    it("should accept zero maxJobs", () => {
      const input = { maxJobs: 0 };
      const result = SimpleJobProcessSchema.parse(input);
      expect(result.maxJobs).toBe(0);
    });

    it("should reject non-number maxJobs", () => {
      const input = { maxJobs: "10" };
      expect(() => SimpleJobProcessSchema.parse(input)).toThrow();
    });
  });

  describe("JobProcessingResultSchema", () => {
    it("should validate minimal result", () => {
      const input = {
        message: "Processing complete",
        processed: 5,
        succeeded: 4,
        failed: 1,
      };
      const result = JobProcessingResultSchema.parse(input);
      expect(result.message).toBe("Processing complete");
      expect(result.processed).toBe(5);
    });

    it("should validate with runner field", () => {
      const input = {
        message: "Processing complete",
        runner: "default-runner",
        processed: 10,
        succeeded: 10,
        failed: 0,
      };
      const result = JobProcessingResultSchema.parse(input);
      expect(result.runner).toBe("default-runner");
    });

    it("should validate with errors array", () => {
      const input = {
        message: "Processing completed with errors",
        processed: 5,
        succeeded: 3,
        failed: 2,
        errors: ["Job 1 failed: timeout", "Job 3 failed: validation"],
      };
      const result = JobProcessingResultSchema.parse(input);
      expect(result.errors).toHaveLength(2);
    });

    it("should accept empty errors array", () => {
      const input = {
        message: "All succeeded",
        processed: 5,
        succeeded: 5,
        failed: 0,
        errors: [],
      };
      const result = JobProcessingResultSchema.parse(input);
      expect(result.errors).toEqual([]);
    });

    it("should require all mandatory fields", () => {
      const input = { message: "test", processed: 1 };
      expect(() => JobProcessingResultSchema.parse(input)).toThrow();
    });
  });

  describe("JobStatusDataSchema", () => {
    it("should validate queued job", () => {
      const input = {
        id: "job-123",
        kind: "normalize",
        status: "queued" as const,
        createdAt: "2024-01-01T00:00:00Z",
      };
      const result = JobStatusDataSchema.parse(input);
      expect(result.status).toBe("queued");
      expect(result.kind).toBe("normalize");
    });

    it("should validate processing job", () => {
      const input = {
        id: "job-123",
        kind: "embed",
        status: "processing" as const,
        createdAt: "2024-01-01T00:00:00Z",
      };
      const result = JobStatusDataSchema.parse(input);
      expect(result.status).toBe("processing");
    });

    it("should validate done job", () => {
      const input = {
        id: "job-123",
        kind: "insight",
        status: "done" as const,
        createdAt: "2024-01-01T00:00:00Z",
      };
      const result = JobStatusDataSchema.parse(input);
      expect(result.status).toBe("done");
    });

    it("should validate error job", () => {
      const input = {
        id: "job-123",
        kind: "google_gmail_sync",
        status: "error" as const,
        createdAt: "2024-01-01T00:00:00Z",
      };
      const result = JobStatusDataSchema.parse(input);
      expect(result.status).toBe("error");
    });

    it("should reject invalid status", () => {
      const input = {
        id: "job-123",
        kind: "test",
        status: "pending",
        createdAt: "2024-01-01",
      };
      expect(() => JobStatusDataSchema.parse(input)).toThrow();
    });

    it("should require all fields", () => {
      const input = { id: "job-123", kind: "test" };
      expect(() => JobStatusDataSchema.parse(input)).toThrow();
    });

    it("should validate all status enum values", () => {
      const statuses = ["queued", "processing", "done", "error"] as const;
      statuses.forEach((status) => {
        const result = JobStatusDataSchema.parse({
          id: "job-123",
          kind: "test",
          status,
          createdAt: "2024-01-01",
        });
        expect(result.status).toBe(status);
      });
    });
  });
});

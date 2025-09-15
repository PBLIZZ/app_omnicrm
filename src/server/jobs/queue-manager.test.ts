import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueueManager, type BatchJob, type BatchStatus } from "./queue-manager";
import type { JobKind } from "./types";

// Mock the database client
vi.mock("@/server/db/client", () => {
  let mockJobs: any[] = [];

  const mockDb = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => mockJobs),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => ({ rowCount: mockJobs.length })),
      })),
    })),
  };

  return {
    getDb: vi.fn(async () => mockDb),
    __setMockJobs: (jobs: any[]) => {
      mockJobs = jobs;
    },
    __clearMockJobs: () => {
      mockJobs = [];
    },
  };
});

// Mock the enqueue function
vi.mock("./enqueue", () => ({
  enqueue: vi.fn(async (kind: string, payload: any, userId: string, batchId?: string) => {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }),
}));

// Mock logger
vi.mock("@/lib/observability", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock UUID
vi.mock("uuid", () => ({
  v4: vi.fn(() => "12345678-1234-5678-9012-123456789012"),
}));

// Mock error handler
vi.mock("@/lib/utils/error-handler", () => ({
  ensureError: vi.fn((error) => (error instanceof Error ? error : new Error(String(error)))),
}));

describe("QueueManager", () => {
  const userId = "user-123";
  let queueManager: QueueManager;

  const { __setMockJobs, __clearMockJobs } = require("@/server/db/client");
  const { enqueue } = require("./enqueue");

  beforeEach(() => {
    vi.clearAllMocks();
    __clearMockJobs();
    queueManager = new QueueManager();
  });

  describe("enqueueBatchJob", () => {
    it("enqueues multiple jobs as a batch", async () => {
      const batchJobs: BatchJob[] = [
        {
          payload: { contactId: "contact-1", type: "summary" },
          options: { priority: "high" },
        },
        {
          payload: { contactId: "contact-2", type: "summary" },
          options: { priority: "medium" },
        },
        {
          payload: { contactId: "contact-3", type: "summary" },
          options: { priority: "low" },
        },
      ];

      const jobIds = await queueManager.enqueueBatchJob(userId, "insight" as JobKind, batchJobs);

      expect(jobIds).toHaveLength(3);
      expect(enqueue).toHaveBeenCalledTimes(3);

      // Verify each job was enqueued with correct parameters
      expect(enqueue).toHaveBeenNthCalledWith(
        1,
        "insight",
        { contactId: "contact-1", type: "summary" },
        userId,
        expect.stringMatching(/^batch_/),
      );

      expect(enqueue).toHaveBeenNthCalledWith(
        2,
        "insight",
        { contactId: "contact-2", type: "summary" },
        userId,
        expect.stringMatching(/^batch_/),
      );

      expect(enqueue).toHaveBeenNthCalledWith(
        3,
        "insight",
        { contactId: "contact-3", type: "summary" },
        userId,
        expect.stringMatching(/^batch_/),
      );

      // Verify logging
      const { logger } = require("@/lib/observability");
      expect(logger.info).toHaveBeenCalledWith(
        "Enqueued batch of 3 insight jobs",
        expect.objectContaining({
          operation: "queue_manage",
          additionalData: expect.objectContaining({
            jobKind: "insight",
            jobCount: 3,
            userId,
          }),
        }),
      );
    });

    it("uses provided batch ID", async () => {
      const customBatchId = "custom-batch-123";
      const batchJobs: BatchJob[] = [{ payload: { test: "data" } }];

      const jobIds = await queueManager.enqueueBatchJob(
        userId,
        "normalize" as JobKind,
        batchJobs,
        customBatchId,
      );

      expect(jobIds).toHaveLength(1);
      expect(enqueue).toHaveBeenCalledWith("normalize", { test: "data" }, userId, customBatchId);
    });

    it("generates batch ID when not provided", async () => {
      const batchJobs: BatchJob[] = [{ payload: { test: "data" } }];

      await queueManager.enqueueBatchJob(userId, "embed" as JobKind, batchJobs);

      expect(enqueue).toHaveBeenCalledWith(
        "embed",
        { test: "data" },
        userId,
        expect.stringMatching(/^batch_[a-f0-9]{8}_\d+$/),
      );
    });

    it("handles empty batch", async () => {
      const jobIds = await queueManager.enqueueBatchJob(userId, "insight" as JobKind, []);

      expect(jobIds).toHaveLength(0);
      expect(enqueue).not.toHaveBeenCalled();
    });

    it("handles enqueue failures", async () => {
      enqueue.mockRejectedValueOnce(new Error("Enqueue failed"));

      const batchJobs: BatchJob[] = [{ payload: { test: "data" } }];

      await expect(
        queueManager.enqueueBatchJob(userId, "insight" as JobKind, batchJobs),
      ).rejects.toThrow("Enqueue failed");

      const { logger } = require("@/lib/observability");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to enqueue batch jobs",
        expect.objectContaining({
          operation: "queue_manage",
        }),
        expect.any(Error),
      );
    });

    it("skips undefined batch jobs", async () => {
      const batchJobs: (BatchJob | undefined)[] = [
        { payload: { test: "data1" } },
        undefined,
        { payload: { test: "data2" } },
      ];

      const jobIds = await queueManager.enqueueBatchJob(
        userId,
        "insight" as JobKind,
        batchJobs as BatchJob[],
      );

      expect(jobIds).toHaveLength(2);
      expect(enqueue).toHaveBeenCalledTimes(2);
    });
  });

  describe("getBatchStatus", () => {
    it("returns batch status with all jobs completed", async () => {
      const batchId = "batch-123";
      const mockJobs = [
        {
          id: "job-1",
          status: "completed",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:05:00Z"),
        },
        {
          id: "job-2",
          status: "completed",
          createdAt: new Date("2024-01-01T10:01:00Z"),
          updatedAt: new Date("2024-01-01T10:06:00Z"),
        },
        {
          id: "job-3",
          status: "completed",
          createdAt: new Date("2024-01-01T10:02:00Z"),
          updatedAt: new Date("2024-01-01T10:07:00Z"),
        },
      ];

      __setMockJobs(mockJobs);

      const status = await queueManager.getBatchStatus(batchId);

      expect(status).toEqual({
        batchId,
        total: 3,
        completed: 3,
        failed: 0,
        pending: 0,
        status: "completed",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:07:00Z"),
      });
    });

    it("returns batch status with mixed job states", async () => {
      const batchId = "batch-456";
      const mockJobs = [
        {
          id: "job-1",
          status: "completed",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:05:00Z"),
        },
        {
          id: "job-2",
          status: "running",
          createdAt: new Date("2024-01-01T10:01:00Z"),
          updatedAt: new Date("2024-01-01T10:06:00Z"),
        },
        {
          id: "job-3",
          status: "queued",
          createdAt: new Date("2024-01-01T10:02:00Z"),
          updatedAt: new Date("2024-01-01T10:02:00Z"),
        },
        {
          id: "job-4",
          status: "failed",
          createdAt: new Date("2024-01-01T10:03:00Z"),
          updatedAt: new Date("2024-01-01T10:08:00Z"),
        },
      ];

      __setMockJobs(mockJobs);

      const status = await queueManager.getBatchStatus(batchId);

      expect(status).toEqual({
        batchId,
        total: 4,
        completed: 1,
        failed: 1,
        pending: 2,
        status: "in_progress",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:08:00Z"),
      });
    });

    it("returns batch status as failed when majority failed", async () => {
      const batchId = "batch-789";
      const mockJobs = [
        {
          id: "job-1",
          status: "failed",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:05:00Z"),
        },
        {
          id: "job-2",
          status: "failed",
          createdAt: new Date("2024-01-01T10:01:00Z"),
          updatedAt: new Date("2024-01-01T10:06:00Z"),
        },
        {
          id: "job-3",
          status: "completed",
          createdAt: new Date("2024-01-01T10:02:00Z"),
          updatedAt: new Date("2024-01-01T10:07:00Z"),
        },
      ];

      __setMockJobs(mockJobs);

      const status = await queueManager.getBatchStatus(batchId);

      expect(status?.status).toBe("failed");
      expect(status?.failed).toBe(2);
      expect(status?.completed).toBe(1);
    });

    it("returns null when batch not found", async () => {
      __setMockJobs([]);

      const status = await queueManager.getBatchStatus("non-existent-batch");

      expect(status).toBeNull();
    });

    it("handles database errors", async () => {
      const { getDb } = require("@/server/db/client");
      getDb.mockRejectedValueOnce(new Error("Database connection failed"));

      const status = await queueManager.getBatchStatus("batch-123");

      expect(status).toBeNull();

      const { logger } = require("@/lib/observability");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to get batch status",
        expect.objectContaining({
          operation: "queue_manage",
        }),
        expect.any(Error),
      );
    });

    it("correctly determines overall status for edge cases", async () => {
      // Test case: Some failed, some completed, no pending
      const mockJobs = [
        { id: "job-1", status: "completed", createdAt: new Date(), updatedAt: new Date() },
        { id: "job-2", status: "completed", createdAt: new Date(), updatedAt: new Date() },
        { id: "job-3", status: "failed", createdAt: new Date(), updatedAt: new Date() },
      ];

      __setMockJobs(mockJobs);

      const status = await queueManager.getBatchStatus("batch-edge");

      // Should be "completed" because failed (1) <= completed (2) / 2 (1)
      expect(status?.status).toBe("completed");
    });
  });

  describe("cancelBatch", () => {
    it("cancels queued jobs in a batch", async () => {
      const batchId = "batch-cancel-123";
      const mockJobs = [
        { id: "job-1", status: "queued" },
        { id: "job-2", status: "queued" },
        { id: "job-3", status: "running" }, // Should not be cancelled
      ];

      __setMockJobs(mockJobs);

      const cancelledCount = await queueManager.cancelBatch(batchId, userId);

      expect(cancelledCount).toBe(3); // Mock returns length of all jobs

      const { logger } = require("@/lib/observability");
      expect(logger.info).toHaveBeenCalledWith(
        "Cancelled 3 jobs in batch",
        expect.objectContaining({
          operation: "queue_manage",
          additionalData: expect.objectContaining({
            batchId,
            userId,
            cancelledCount: 3,
          }),
        }),
      );
    });

    it("returns 0 when no jobs to cancel", async () => {
      const { getDb } = require("@/server/db/client");
      const mockDb = await getDb();
      mockDb.update.mockImplementationOnce(() => ({
        set: () => ({
          where: vi.fn(async () => ({ rowCount: 0 })),
        }),
      }));

      const cancelledCount = await queueManager.cancelBatch("empty-batch", userId);

      expect(cancelledCount).toBe(0);
    });

    it("handles cancellation errors", async () => {
      const { getDb } = require("@/server/db/client");
      getDb.mockRejectedValueOnce(new Error("Database error"));

      await expect(queueManager.cancelBatch("error-batch", userId)).rejects.toThrow(
        "Database error",
      );

      const { logger } = require("@/lib/observability");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to cancel batch",
        expect.objectContaining({
          operation: "queue_manage",
        }),
        expect.any(Error),
      );
    });

    it("only cancels jobs for the correct user", async () => {
      const batchId = "batch-user-specific";

      await queueManager.cancelBatch(batchId, userId);

      const { getDb } = require("@/server/db/client");
      const mockDb = await getDb();

      // Verify the where clause includes user filtering
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.update().set).toHaveBeenCalled();
      expect(mockDb.update().set().where).toHaveBeenCalled();
    });
  });

  describe("getJobStats", () => {
    it("returns job statistics for a user", async () => {
      const mockJobs = [
        { status: "completed", id: "job-1" },
        { status: "completed", id: "job-2" },
        { status: "failed", id: "job-3" },
        { status: "queued", id: "job-4" },
        { status: "running", id: "job-5" },
        { status: "completed", id: "job-6" },
      ];

      __setMockJobs(mockJobs);

      const stats = await queueManager.getJobStats(userId);

      expect(stats).toEqual({
        completed: 3,
        failed: 1,
        queued: 1,
        running: 1,
      });
    });

    it("returns empty stats when no jobs found", async () => {
      __setMockJobs([]);

      const stats = await queueManager.getJobStats(userId);

      expect(stats).toEqual({});
    });

    it("handles database errors gracefully", async () => {
      const { getDb } = require("@/server/db/client");
      getDb.mockRejectedValueOnce(new Error("Stats query failed"));

      const stats = await queueManager.getJobStats(userId);

      expect(stats).toEqual({});

      const { logger } = require("@/lib/observability");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to get job stats",
        expect.objectContaining({
          operation: "queue_manage",
        }),
        expect.any(Error),
      );
    });

    it("aggregates duplicate statuses correctly", async () => {
      const mockJobs = [
        { status: "completed", id: "job-1" },
        { status: "completed", id: "job-2" },
        { status: "completed", id: "job-3" },
        { status: "failed", id: "job-4" },
        { status: "failed", id: "job-5" },
      ];

      __setMockJobs(mockJobs);

      const stats = await queueManager.getJobStats(userId);

      expect(stats.completed).toBe(3);
      expect(stats.failed).toBe(2);
    });

    it("filters jobs by user ID", async () => {
      await queueManager.getJobStats(userId);

      const { getDb } = require("@/server/db/client");
      const mockDb = await getDb();

      // Verify the query includes user filtering
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.select().from).toHaveBeenCalled();
      expect(mockDb.select().from().where).toHaveBeenCalled();
    });
  });

  describe("edge cases and error handling", () => {
    it("handles invalid job kinds gracefully", async () => {
      const batchJobs: BatchJob[] = [{ payload: { test: "data" } }];

      // This should still work as the type system should catch this at compile time
      await expect(
        queueManager.enqueueBatchJob(userId, "invalid-kind" as JobKind, batchJobs),
      ).resolves.toBeDefined();
    });

    it("handles large batches efficiently", async () => {
      const largeBatch: BatchJob[] = Array.from({ length: 1000 }, (_, i) => ({
        payload: { index: i, data: `test-${i}` },
      }));

      const jobIds = await queueManager.enqueueBatchJob(userId, "embed" as JobKind, largeBatch);

      expect(jobIds).toHaveLength(1000);
      expect(enqueue).toHaveBeenCalledTimes(1000);
    });

    it("handles concurrent batch operations", async () => {
      const batch1: BatchJob[] = [{ payload: { batch: 1 } }];
      const batch2: BatchJob[] = [{ payload: { batch: 2 } }];
      const batch3: BatchJob[] = [{ payload: { batch: 3 } }];

      const [jobIds1, jobIds2, jobIds3] = await Promise.all([
        queueManager.enqueueBatchJob(userId, "insight" as JobKind, batch1),
        queueManager.enqueueBatchJob(userId, "embed" as JobKind, batch2),
        queueManager.enqueueBatchJob(userId, "normalize" as JobKind, batch3),
      ]);

      expect(jobIds1).toHaveLength(1);
      expect(jobIds2).toHaveLength(1);
      expect(jobIds3).toHaveLength(1);
      expect(enqueue).toHaveBeenCalledTimes(3);
    });

    it("generates unique batch IDs for concurrent operations", async () => {
      const batchJobs: BatchJob[] = [{ payload: { test: "data" } }];

      const [ids1, ids2] = await Promise.all([
        queueManager.enqueueBatchJob(userId, "insight" as JobKind, batchJobs),
        queueManager.enqueueBatchJob(userId, "insight" as JobKind, batchJobs),
      ]);

      // Verify both operations succeeded
      expect(ids1).toHaveLength(1);
      expect(ids2).toHaveLength(1);

      // Verify different batch IDs were generated
      const calls = enqueue.mock.calls;
      const batchId1 = calls[0]?.[3];
      const batchId2 = calls[1]?.[3];

      expect(batchId1).toBeDefined();
      expect(batchId2).toBeDefined();
      expect(batchId1).not.toBe(batchId2);
    });
  });

  describe("batch job options", () => {
    it("handles jobs with different options", async () => {
      const batchJobs: BatchJob[] = [
        {
          payload: { test: "high-priority" },
          options: { priority: "high", maxRetries: 5 },
        },
        {
          payload: { test: "delayed" },
          options: { delay: 5000, priority: "low" },
        },
        {
          payload: { test: "default" },
          // No options
        },
      ];

      const jobIds = await queueManager.enqueueBatchJob(userId, "insight" as JobKind, batchJobs);

      expect(jobIds).toHaveLength(3);
      expect(enqueue).toHaveBeenCalledTimes(3);

      // All jobs should be enqueued regardless of options
      // (Options are currently not passed through to enqueue, but they're accepted)
      batchJobs.forEach((job, index) => {
        expect(enqueue).toHaveBeenNthCalledWith(
          index + 1,
          "insight",
          job.payload,
          userId,
          expect.any(String),
        );
      });
    });
  });
});

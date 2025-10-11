import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JobsRepository } from "../jobs.repo";
import { getDb } from "@/server/db/client";
import { isOk, isErr } from "@/lib/utils/result";

vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

describe("JobsRepository", () => {
  const mockUserId = "test-user-123";
  const mockJobId = "job-456";
  const mockBatchId = "batch-789";
  
  let mockDb: any;
  
  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
    
    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createJob", () => {
    it("should create a job with required fields", async () => {
      const jobData = {
        userId: mockUserId,
        kind: "sync_gmail",
        payload: { syncType: "full" },
      };

      const mockJob = {
        id: mockJobId,
        ...jobData,
        batchId: null,
        status: "queued",
        attempts: 0,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([mockJob]);

      const result = await JobsRepository.createJob(jobData);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.kind).toBe(jobData.kind);
        expect(result.data.status).toBe("queued");
        expect(result.data.attempts).toBe(0);
      }
    });

    it("should create a job with batchId", async () => {
      const jobData = {
        userId: mockUserId,
        kind: "process_emails",
        payload: {},
        batchId: mockBatchId,
      };

      const mockJob = {
        id: mockJobId,
        ...jobData,
        status: "queued",
        attempts: 0,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([mockJob]);

      const result = await JobsRepository.createJob(jobData);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.batchId).toBe(mockBatchId);
      }
    });

    it("should return validation error when userId is missing", async () => {
      const jobData = {
        userId: "",
        kind: "test_job",
        payload: {},
      };

      const result = await JobsRepository.createJob(jobData);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.message).toContain("userId");
      }
    });

    it("should return validation error when kind is missing", async () => {
      const jobData = {
        userId: mockUserId,
        kind: "",
        payload: {},
      };

      const result = await JobsRepository.createJob(jobData);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.message).toContain("kind");
      }
    });

    it("should return error when insert fails", async () => {
      const jobData = {
        userId: mockUserId,
        kind: "test_job",
        payload: {},
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockRejectedValueOnce(new Error("Database error"));

      const result = await JobsRepository.createJob(jobData);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("DB_INSERT_FAILED");
      }
    });

    it("should return error when no data returned", async () => {
      const jobData = {
        userId: mockUserId,
        kind: "test_job",
        payload: {},
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await JobsRepository.createJob(jobData);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("DB_INSERT_FAILED");
        expect(result.error.message).toContain("no data returned");
      }
    });
  });

  describe("getJobById", () => {
    it("should retrieve a job by ID", async () => {
      const mockJob = {
        id: mockJobId,
        userId: mockUserId,
        kind: "sync_calendar",
        payload: { events: 10 },
        status: "processing",
        attempts: 1,
        batchId: null,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockJob]);

      const result = await JobsRepository.getJobById(mockUserId, mockJobId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data?.id).toBe(mockJobId);
        expect(result.data?.status).toBe("processing");
      }
    });

    it("should return null when job not found", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await JobsRepository.getJobById(mockUserId, "non-existent");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBeNull();
      }
    });

    it("should enforce userId filtering", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      await JobsRepository.getJobById(mockUserId, mockJobId);

      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should return error on database failure", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockRejectedValueOnce(new Error("Connection timeout"));

      const result = await JobsRepository.getJobById(mockUserId, mockJobId);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("DB_QUERY_FAILED");
      }
    });
  });

  describe("listJobs", () => {
    it("should list all jobs for a user", async () => {
      const mockJobs = [
        {
          id: "job-1",
          userId: mockUserId,
          kind: "sync_gmail",
          payload: {},
          status: "completed",
          attempts: 1,
          batchId: null,
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "job-2",
          userId: mockUserId,
          kind: "process_contacts",
          payload: {},
          status: "queued",
          attempts: 0,
          batchId: null,
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockJobs);

      const result = await JobsRepository.listJobs(mockUserId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.items).toHaveLength(2);
      }
    });

    it("should filter jobs by status", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce([]);

      await JobsRepository.listJobs(mockUserId, {
        status: ["queued", "processing"],
      });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should filter jobs by kind", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce([]);

      await JobsRepository.listJobs(mockUserId, {
        kind: ["sync_gmail"],
      });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should apply pagination", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce([]);

      await JobsRepository.listJobs(mockUserId, {
        page: 2,
        pageSize: 25,
      });

      expect(mockDb.limit).toHaveBeenCalledWith(25);
      expect(mockDb.offset).toHaveBeenCalledWith(25);
    });

    it("should handle empty results", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce([]);

      const result = await JobsRepository.listJobs(mockUserId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.items).toEqual([]);
      }
    });
  });

  describe("updateJobStatus", () => {
    it("should update job status to processing", async () => {
      const mockUpdated = {
        id: mockJobId,
        userId: mockUserId,
        kind: "test_job",
        payload: {},
        status: "processing",
        attempts: 1,
        batchId: null,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([mockUpdated]);

      const result = await JobsRepository.updateJobStatus(
        mockUserId,
        mockJobId,
        "processing"
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data?.status).toBe("processing");
      }
    });

    it("should update job status to failed with error", async () => {
      const errorMessage = "Network timeout";

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([]);

      await JobsRepository.updateJobStatus(
        mockUserId,
        mockJobId,
        "failed",
        errorMessage
      );

      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          lastError: errorMessage,
        })
      );
    });

    it("should increment attempts", async () => {
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([]);

      await JobsRepository.updateJobStatus(mockUserId, mockJobId, "processing");

      expect(mockDb.set).toHaveBeenCalled();
    });

    it("should return null when job not found", async () => {
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await JobsRepository.updateJobStatus(
        mockUserId,
        "non-existent",
        "completed"
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe("getQueuedJobs", () => {
    it("should retrieve queued jobs ordered by creation time", async () => {
      const mockJobs = [
        {
          id: "job-1",
          userId: mockUserId,
          kind: "sync_gmail",
          payload: {},
          status: "queued",
          attempts: 0,
          batchId: null,
          lastError: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date(),
        },
        {
          id: "job-2",
          userId: mockUserId,
          kind: "process_contacts",
          payload: {},
          status: "queued",
          attempts: 0,
          batchId: null,
          lastError: null,
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce(mockJobs);

      const result = await JobsRepository.getQueuedJobs(10);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toHaveLength(2);
      }
    });

    it("should respect limit parameter", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      await JobsRepository.getQueuedJobs(5);

      expect(mockDb.limit).toHaveBeenCalledWith(5);
    });

    it("should only return queued jobs", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      await JobsRepository.getQueuedJobs(10);

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("deleteJob", () => {
    it("should delete a job", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce({ rowCount: 1 });

      const result = await JobsRepository.deleteJob(mockUserId, mockJobId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(true);
      }
    });

    it("should return false when job not found", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce({ rowCount: 0 });

      const result = await JobsRepository.deleteJob(mockUserId, "non-existent");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(false);
      }
    });

    it("should enforce userId filtering", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce({ rowCount: 0 });

      await JobsRepository.deleteJob("different-user", mockJobId);

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("getJobsByBatchId", () => {
    it("should retrieve all jobs in a batch", async () => {
      const mockJobs = [
        {
          id: "job-1",
          userId: mockUserId,
          kind: "process_email",
          payload: {},
          status: "completed",
          attempts: 1,
          batchId: mockBatchId,
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "job-2",
          userId: mockUserId,
          kind: "process_email",
          payload: {},
          status: "completed",
          attempts: 1,
          batchId: mockBatchId,
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockJobs);

      const result = await JobsRepository.getJobsByBatchId(mockUserId, mockBatchId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every(job => job.batchId === mockBatchId)).toBe(true);
      }
    });

    it("should return empty array when no jobs found", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce([]);

      const result = await JobsRepository.getJobsByBatchId(mockUserId, "non-existent");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toEqual([]);
      }
    });
  });
});
/**
 * Unit tests for JobStatusService
 * 
 * Tests comprehensive job status functionality including:
 * - Comprehensive job status retrieval
 * - Data freshness calculation
 * - Estimated completion time
 * - Processing health metrics
 * - Job formatting and legacy compatibility
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { JobStatusService } from "./job-status.service";
import { JobsRepository, ContactsRepository, InteractionsRepository, RawEventsRepository } from "@repo";
import type { JobDTO } from "@/server/db/business-schemas/business-schema";

// Mock dependencies
vi.mock("@repo");
vi.mock("@/lib/observability");

const mockLogger = {
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
};

describe("JobStatusService", () => {
  const testUserId = "test-user-123";
  const testBatchId = "batch-456";

  beforeEach(async () => {
    vi.clearAllMocks();

    const { logger } = await import("@/lib/observability");
    Object.assign(logger, mockLogger);

    // Default mock implementations
    vi.mocked(JobsRepository.getJobCounts).mockResolvedValue({
      statusCounts: {
        queued: 5,
        processing: 2,
        completed: 100,
        failed: 3,
        retrying: 1,
      },
      kindCounts: {
        normalize: 3,
        embed: 2,
        insight: 1,
        sync_gmail: 1,
        sync_calendar: 0,
        google_gmail_sync: 0,
      },
    });

    vi.mocked(JobsRepository.getPendingJobs).mockResolvedValue([]);
    vi.mocked(JobsRepository.getRecentJobs).mockResolvedValue([]);
    vi.mocked(JobsRepository.getStuckJobs).mockResolvedValue([]);

    vi.mocked(RawEventsRepository.countRawEvents).mockResolvedValue(50);
    vi.mocked(InteractionsRepository.countInteractions).mockResolvedValue(45);
    vi.mocked(ContactsRepository.countContacts).mockResolvedValue(20);
  });

  describe("getComprehensiveJobStatus", () => {
    it("should return comprehensive job status with all components", async () => {
      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status).toHaveProperty("queue");
      expect(status).toHaveProperty("pendingJobs");
      expect(status).toHaveProperty("dataFreshness");
      expect(status).toHaveProperty("estimatedCompletion");
      expect(status).toHaveProperty("stuckJobs");
      expect(status).toHaveProperty("health");
      expect(status).toHaveProperty("jobs");
      expect(status).toHaveProperty("timestamp");

      expect(status.queue.totalJobs).toBe(111); // Sum of all status counts
      expect(status.queue.pendingJobs).toBe(8); // queued + processing + retrying
      expect(status.queue.failedJobs).toBe(3);
    });

    it("should calculate queue status correctly", async () => {
      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.queue.statusCounts).toEqual({
        queued: 5,
        processing: 2,
        completed: 100,
        failed: 3,
        retrying: 1,
      });

      expect(status.queue.kindCounts).toEqual({
        normalize: 3,
        embed: 2,
        insight: 1,
        sync_gmail: 1,
        sync_calendar: 0,
        google_gmail_sync: 0,
      });
    });

    it("should include data freshness when requested", async () => {
      const status = await JobStatusService.getComprehensiveJobStatus(testUserId, {
        includeFreshness: true,
      });

      expect(status.dataFreshness).toBeDefined();
      expect(status.dataFreshness?.totalRawEvents).toBe(50);
      expect(status.dataFreshness?.totalInteractions).toBe(45);
      expect(status.dataFreshness?.totalContacts).toBe(20);
      expect(status.dataFreshness?.processingRate).toBe(90); // 45/50 * 100
    });

    it("should exclude data freshness when not requested", async () => {
      const status = await JobStatusService.getComprehensiveJobStatus(testUserId, {
        includeFreshness: false,
      });

      expect(status.dataFreshness).toBeNull();
    });

    it("should format pending jobs correctly", async () => {
      const mockPendingJobs: JobDTO[] = [
        {
          id: "job-1",
          userId: testUserId,
          kind: "normalize",
          status: "queued",
          attempts: 0,
          batchId: testBatchId,
          createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
          updatedAt: new Date(),
          payload: {},
          lastError: null,
        } as JobDTO,
        {
          id: "job-2",
          userId: testUserId,
          kind: "embed",
          status: "processing",
          attempts: 1,
          batchId: testBatchId,
          createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
          updatedAt: new Date(),
          payload: {},
          lastError: "Previous error",
        } as JobDTO,
      ];

      vi.mocked(JobsRepository.getPendingJobs).mockResolvedValue(mockPendingJobs);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.pendingJobs).toHaveLength(2);
      expect(status.pendingJobs[0]).toMatchObject({
        id: "job-1",
        kind: "normalize",
        status: "queued",
        attempts: 0,
        hasError: false,
        ageMinutes: 5,
      });
      expect(status.pendingJobs[1]).toMatchObject({
        id: "job-2",
        kind: "embed",
        status: "processing",
        attempts: 1,
        hasError: true,
        ageMinutes: 10,
      });
    });

    it("should calculate estimated completion time", async () => {
      const mockPendingJobs: JobDTO[] = [
        {
          id: "job-1",
          kind: "normalize",
          status: "queued",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as JobDTO,
        {
          id: "job-2",
          kind: "embed",
          status: "queued",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as JobDTO,
        {
          id: "job-3",
          kind: "insight",
          status: "queued",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as JobDTO,
      ];

      vi.mocked(JobsRepository.getPendingJobs).mockResolvedValue(mockPendingJobs);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.estimatedCompletion).toBeDefined();
      expect(status.estimatedCompletion?.totalJobs).toBe(3);
      expect(status.estimatedCompletion?.estimatedSeconds).toBe(17); // 2 + 5 + 10
      expect(status.estimatedCompletion?.estimatedMinutes).toBe(1);
      expect(status.estimatedCompletion?.estimatedCompletionAt).toBeDefined();
    });

    it("should return null estimated completion when no pending jobs", async () => {
      vi.mocked(JobsRepository.getPendingJobs).mockResolvedValue([]);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.estimatedCompletion).toBeNull();
    });

    it("should identify stuck jobs", async () => {
      const mockStuckJobs: JobDTO[] = [
        {
          id: "stuck-1",
          kind: "normalize",
          status: "processing",
          updatedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          createdAt: new Date(),
        } as JobDTO,
      ];

      vi.mocked(JobsRepository.getStuckJobs).mockResolvedValue(mockStuckJobs);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.stuckJobs).toHaveLength(1);
      expect(status.stuckJobs[0]).toMatchObject({
        id: "stuck-1",
        kind: "normalize",
        ageMinutes: 60,
      });
    });

    it("should calculate processing health correctly", async () => {
      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.health).toBeDefined();
      expect(status.health.score).toBeGreaterThan(0);
      expect(status.health.score).toBeLessThanOrEqual(100);
      expect(status.health.status).toMatch(/excellent|good|warning|critical/);
      expect(Array.isArray(status.health.issues)).toBe(true);
    });

    it("should handle errors gracefully and return empty status", async () => {
      vi.mocked(JobsRepository.getJobCounts).mockRejectedValue(new Error("Database error"));

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.queue.totalJobs).toBe(0);
      expect(status.health.status).toBe("critical");
      expect(status.health.issues).toContain("Unable to fetch job status");
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should filter by batch ID when provided", async () => {
      await JobStatusService.getComprehensiveJobStatus(testUserId, {
        batchId: testBatchId,
      });

      expect(JobsRepository.getJobCounts).toHaveBeenCalledWith(testUserId, testBatchId);
      expect(JobsRepository.getPendingJobs).toHaveBeenCalledWith(testUserId, testBatchId, 50);
      expect(JobsRepository.getRecentJobs).toHaveBeenCalledWith(testUserId, testBatchId, 20);
    });

    it("should include more history when requested", async () => {
      await JobStatusService.getComprehensiveJobStatus(testUserId, {
        includeHistory: true,
      });

      expect(JobsRepository.getRecentJobs).toHaveBeenCalledWith(testUserId, undefined, 50);
    });

    it("should parse legacy gmail sync job payload", async () => {
      const mockGmailSyncJob: JobDTO = {
        id: "gmail-sync-1",
        userId: testUserId,
        kind: "google_gmail_sync",
        status: "processing",
        batchId: testBatchId,
        payload: {
          totalEmails: 100,
          processedEmails: 50,
          newEmails: 10,
          chunkSize: 50,
          chunksTotal: 2,
          chunksProcessed: 1,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: 0,
        lastError: null,
      } as JobDTO;

      vi.mocked(JobsRepository.getRecentJobs).mockResolvedValue([mockGmailSyncJob]);
      vi.mocked(RawEventsRepository.countRawEvents).mockResolvedValue(50);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.currentBatch).toBe(testBatchId);
      expect(status.totalEmails).toBe(100);
      expect(status.processedEmails).toBe(50);
    });
  });

  describe("health score calculation", () => {
    it("should return excellent health for perfect scenario", async () => {
      vi.mocked(JobsRepository.getJobCounts).mockResolvedValue({
        statusCounts: {
          queued: 2,
          processing: 1,
          completed: 100,
          failed: 0,
          retrying: 0,
        },
        kindCounts: {
          normalize: 1,
          embed: 1,
          insight: 1,
          sync_gmail: 0,
          sync_calendar: 0,
          google_gmail_sync: 0,
        },
      });

      vi.mocked(JobsRepository.getStuckJobs).mockResolvedValue([]);
      vi.mocked(JobsRepository.getRecentJobs).mockResolvedValue([]);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.health.status).toBe("excellent");
      expect(status.health.score).toBeGreaterThanOrEqual(90);
      expect(status.health.issues).toHaveLength(0);
    });

    it("should return warning health for moderate issues", async () => {
      vi.mocked(JobsRepository.getJobCounts).mockResolvedValue({
        statusCounts: {
          queued: 20,
          processing: 5,
          completed: 50,
          failed: 10,
          retrying: 2,
        },
        kindCounts: {
          normalize: 10,
          embed: 8,
          insight: 9,
          sync_gmail: 0,
          sync_calendar: 0,
          google_gmail_sync: 0,
        },
      });

      const mockRecentJobs: JobDTO[] = Array(5).fill({
        status: "failed",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as JobDTO);

      vi.mocked(JobsRepository.getRecentJobs).mockResolvedValue(mockRecentJobs);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.health.status).toMatch(/warning|critical/);
      expect(status.health.score).toBeLessThan(90);
      expect(status.health.issues.length).toBeGreaterThan(0);
    });

    it("should return critical health for severe issues", async () => {
      vi.mocked(JobsRepository.getJobCounts).mockResolvedValue({
        statusCounts: {
          queued: 100,
          processing: 10,
          completed: 10,
          failed: 50,
          retrying: 5,
        },
        kindCounts: {
          normalize: 50,
          embed: 50,
          insight: 55,
          sync_gmail: 10,
          sync_calendar: 0,
          google_gmail_sync: 0,
        },
      });

      const mockStuckJobs: JobDTO[] = Array(5).fill({
        id: "stuck",
        kind: "normalize",
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date(),
      } as JobDTO);

      vi.mocked(JobsRepository.getStuckJobs).mockResolvedValue(mockStuckJobs);

      const mockRecentJobs: JobDTO[] = Array(15).fill({
        status: "failed",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as JobDTO);

      vi.mocked(JobsRepository.getRecentJobs).mockResolvedValue(mockRecentJobs);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.health.status).toBe("critical");
      expect(status.health.score).toBeLessThan(50);
      expect(status.health.issues).toContain(expect.stringContaining("stuck"));
      expect(status.health.issues).toContain(expect.stringContaining("failed jobs"));
    });

    it("should identify high failure rate", async () => {
      vi.mocked(JobsRepository.getJobCounts).mockResolvedValue({
        statusCounts: {
          queued: 5,
          processing: 2,
          completed: 20,
          failed: 15,
          retrying: 0,
        },
        kindCounts: {
          normalize: 15,
          embed: 10,
          insight: 17,
          sync_gmail: 0,
          sync_calendar: 0,
          google_gmail_sync: 0,
        },
      });

      const mockRecentJobs: JobDTO[] = Array(10).fill({
        status: "failed",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as JobDTO);

      vi.mocked(JobsRepository.getRecentJobs).mockResolvedValue(mockRecentJobs);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.health.issues).toContain(expect.stringContaining("failure rate"));
    });

    it("should identify large job backlog", async () => {
      vi.mocked(JobsRepository.getJobCounts).mockResolvedValue({
        statusCounts: {
          queued: 100,
          processing: 5,
          completed: 50,
          failed: 0,
          retrying: 0,
        },
        kindCounts: {
          normalize: 50,
          embed: 30,
          insight: 25,
          sync_gmail: 0,
          sync_calendar: 0,
          google_gmail_sync: 0,
        },
      });

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.health.issues).toContain(expect.stringContaining("backlog"));
    });
  });

  describe("data freshness calculation", () => {
    it("should calculate processing rate correctly", async () => {
      vi.mocked(RawEventsRepository.countRawEvents).mockResolvedValue(100);
      vi.mocked(InteractionsRepository.countInteractions).mockResolvedValue(80);
      vi.mocked(ContactsRepository.countContacts).mockResolvedValue(50);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId, {
        includeFreshness: true,
      });

      expect(status.dataFreshness?.processingRate).toBe(80); // 80/100 * 100
      expect(status.dataFreshness?.totalRawEvents).toBe(100);
      expect(status.dataFreshness?.totalInteractions).toBe(80);
      expect(status.dataFreshness?.totalContacts).toBe(50);
    });

    it("should cap processing rate at 100%", async () => {
      vi.mocked(RawEventsRepository.countRawEvents).mockResolvedValue(50);
      vi.mocked(InteractionsRepository.countInteractions).mockResolvedValue(75);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId, {
        includeFreshness: true,
      });

      expect(status.dataFreshness?.processingRate).toBe(100);
    });

    it("should handle zero raw events gracefully", async () => {
      vi.mocked(RawEventsRepository.countRawEvents).mockResolvedValue(0);
      vi.mocked(InteractionsRepository.countInteractions).mockResolvedValue(0);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId, {
        includeFreshness: true,
      });

      expect(status.dataFreshness?.processingRate).toBe(100);
    });

    it("should indicate when processing is needed", async () => {
      vi.mocked(JobsRepository.getJobCounts).mockResolvedValue({
        statusCounts: {
          queued: 10,
          processing: 5,
          completed: 50,
          failed: 0,
          retrying: 0,
        },
        kindCounts: {
          normalize: 5,
          embed: 5,
          insight: 5,
          sync_gmail: 0,
          sync_calendar: 0,
          google_gmail_sync: 0,
        },
      });

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId, {
        includeFreshness: true,
      });

      expect(status.dataFreshness?.needsProcessing).toBe(true);
    });

    it("should show pending job counts by type", async () => {
      vi.mocked(JobsRepository.getJobCounts).mockResolvedValue({
        statusCounts: {
          queued: 15,
          processing: 0,
          completed: 0,
          failed: 0,
          retrying: 0,
        },
        kindCounts: {
          normalize: 5,
          embed: 7,
          insight: 3,
          sync_gmail: 0,
          sync_calendar: 0,
          google_gmail_sync: 0,
        },
      });

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId, {
        includeFreshness: true,
      });

      expect(status.dataFreshness?.pendingNormalization).toBe(5);
      expect(status.dataFreshness?.pendingEmbedding).toBe(7);
      expect(status.dataFreshness?.pendingInsights).toBe(3);
    });

    it("should include last processed timestamp", async () => {
      const completedJobDate = new Date("2024-01-15T10:00:00Z");
      const mockRecentJobs: JobDTO[] = [
        {
          id: "completed-1",
          status: "completed",
          updatedAt: completedJobDate,
          createdAt: new Date(),
        } as JobDTO,
      ];

      vi.mocked(JobsRepository.getRecentJobs).mockResolvedValue(mockRecentJobs);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId, {
        includeFreshness: true,
      });

      expect(status.dataFreshness?.lastProcessedAt).toBe(completedJobDate.toISOString());
    });
  });

  describe("legacy compatibility", () => {
    it("should include legacy jobs array", async () => {
      const mockRecentJobs: JobDTO[] = [
        {
          id: "job-1",
          userId: testUserId,
          kind: "normalize",
          status: "completed",
          batchId: testBatchId,
          createdAt: new Date(),
          updatedAt: new Date(),
          attempts: 1,
          lastError: null,
        } as JobDTO,
      ];

      vi.mocked(JobsRepository.getRecentJobs).mockResolvedValue(mockRecentJobs);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.jobs).toBeDefined();
      expect(Array.isArray(status.jobs)).toBe(true);
      expect(status.jobs.length).toBe(1);
      expect(status.jobs[0].id).toBe("job-1");
    });

    it("should include current batch ID when available", async () => {
      const mockJobs: JobDTO[] = [
        {
          id: "job-1",
          kind: "normalize",
          status: "queued",
          batchId: testBatchId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as JobDTO,
      ];

      vi.mocked(JobsRepository.getRecentJobs).mockResolvedValue(mockJobs);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.currentBatch).toBe(testBatchId);
    });

    it("should format legacy gmail sync progress fields", async () => {
      const mockGmailJob: JobDTO = {
        id: "gmail-1",
        kind: "google_gmail_sync",
        status: "processing",
        batchId: testBatchId,
        payload: {
          totalEmails: 200,
          processedEmails: 150,
          newEmails: 50,
          chunkSize: 50,
          chunksTotal: 4,
          chunksProcessed: 3,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: 0,
        lastError: null,
      } as JobDTO;

      vi.mocked(JobsRepository.getRecentJobs).mockResolvedValue([mockGmailJob]);

      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      const gmailJobStatus = status.jobs.find(j => j.kind === "google_gmail_sync");
      expect(gmailJobStatus).toBeDefined();
      expect(gmailJobStatus?.totalEmails).toBe(200);
      expect(gmailJobStatus?.processedEmails).toBe(150);
      expect(gmailJobStatus?.newEmails).toBe(50);
      expect(gmailJobStatus?.progress).toBe(75); // 150/200 * 100
      expect(gmailJobStatus?.chunksTotal).toBe(4);
      expect(gmailJobStatus?.chunksProcessed).toBe(3);
    });

    it("should include timestamp in response", async () => {
      const status = await JobStatusService.getComprehensiveJobStatus(testUserId);

      expect(status.timestamp).toBeDefined();
      expect(new Date(status.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});
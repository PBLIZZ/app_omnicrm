import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSyncSummaryService,
  isSyncJobKind,
} from "../sync-progress.service";
import * as jobProcessingService from "../job-processing.service";

vi.mock("../job-processing.service");

describe("SyncProgressService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isSyncJobKind", () => {
    it("should return true for valid sync job kinds", () => {
      expect(isSyncJobKind("google_gmail_sync")).toBe(true);
      expect(isSyncJobKind("google_calendar_sync")).toBe(true);
      expect(isSyncJobKind("normalize_google_email")).toBe(true);
      expect(isSyncJobKind("normalize_google_event")).toBe(true);
    });

    it("should return false for invalid job kinds", () => {
      expect(isSyncJobKind("random_job")).toBe(false);
      expect(isSyncJobKind("")).toBe(false);
      expect(isSyncJobKind("GOOGLE_GMAIL_SYNC")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isSyncJobKind("google_gmail_sync ")).toBe(false);
      expect(isSyncJobKind(" google_gmail_sync")).toBe(false);
    });
  });

  describe("getSyncSummaryService", () => {
    const mockUserId = "test-user-123";

    it("should return status as processing when jobs are processing", async () => {
      vi.mocked(jobProcessingService.getJobSummaryService).mockResolvedValue({
        pending: 5,
        processing: 2,
        retrying: 1,
        failed: 0,
      });

      vi.mocked(jobProcessingService.listRecentJobsService).mockResolvedValue([
        {
          id: "job-1",
          kind: "google_gmail_sync",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:05:00Z"),
        } as any,
      ]);

      const result = await getSyncSummaryService(mockUserId);

      expect(result.status).toBe("processing");
      expect(result.pendingJobs).toBe(5);
      expect(result.retryingJobs).toBe(1);
      expect(result.failedJobs).toBe(0);
      expect(result.lastSyncAt).toBe("2024-01-01T10:05:00Z");
    });

    it("should return status as queued when jobs are pending", async () => {
      vi.mocked(jobProcessingService.getJobSummaryService).mockResolvedValue({
        pending: 3,
        processing: 0,
        retrying: 0,
        failed: 0,
      });

      vi.mocked(jobProcessingService.listRecentJobsService).mockResolvedValue([
        {
          id: "job-1",
          kind: "google_calendar_sync",
          createdAt: new Date("2024-01-01T09:00:00Z"),
          updatedAt: new Date("2024-01-01T09:00:00Z"),
        } as any,
      ]);

      const result = await getSyncSummaryService(mockUserId);

      expect(result.status).toBe("queued");
      expect(result.pendingJobs).toBe(3);
    });

    it("should return status as idle when no jobs are active", async () => {
      vi.mocked(jobProcessingService.getJobSummaryService).mockResolvedValue({
        pending: 0,
        processing: 0,
        retrying: 0,
        failed: 2,
      });

      vi.mocked(jobProcessingService.listRecentJobsService).mockResolvedValue([
        {
          id: "job-1",
          kind: "normalize_google_email",
          createdAt: new Date("2024-01-01T08:00:00Z"),
          updatedAt: new Date("2024-01-01T08:05:00Z"),
        } as any,
      ]);

      const result = await getSyncSummaryService(mockUserId);

      expect(result.status).toBe("idle");
      expect(result.failedJobs).toBe(2);
    });

    it("should handle retrying jobs as queued status", async () => {
      vi.mocked(jobProcessingService.getJobSummaryService).mockResolvedValue({
        pending: 0,
        processing: 0,
        retrying: 2,
        failed: 0,
      });

      vi.mocked(jobProcessingService.listRecentJobsService).mockResolvedValue([]);

      const result = await getSyncSummaryService(mockUserId);

      expect(result.status).toBe("queued");
      expect(result.retryingJobs).toBe(2);
    });

    it("should return null lastSyncAt when no sync jobs found", async () => {
      vi.mocked(jobProcessingService.getJobSummaryService).mockResolvedValue({
        pending: 0,
        processing: 0,
        retrying: 0,
        failed: 0,
      });

      vi.mocked(jobProcessingService.listRecentJobsService).mockResolvedValue([
        {
          id: "job-1",
          kind: "some_other_job",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ]);

      const result = await getSyncSummaryService(mockUserId);

      expect(result.lastSyncAt).toBeNull();
    });

    it("should use updatedAt if available, otherwise createdAt", async () => {
      vi.mocked(jobProcessingService.getJobSummaryService).mockResolvedValue({
        pending: 0,
        processing: 0,
        retrying: 0,
        failed: 0,
      });

      vi.mocked(jobProcessingService.listRecentJobsService).mockResolvedValue([
        {
          id: "job-1",
          kind: "google_gmail_sync",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: undefined,
        } as any,
      ]);

      const result = await getSyncSummaryService(mockUserId);

      expect(result.lastSyncAt).toBe("2024-01-01T10:00:00Z");
    });

    it("should find first sync job in recent jobs list", async () => {
      vi.mocked(jobProcessingService.getJobSummaryService).mockResolvedValue({
        pending: 0,
        processing: 0,
        retrying: 0,
        failed: 0,
      });

      vi.mocked(jobProcessingService.listRecentJobsService).mockResolvedValue([
        {
          id: "job-1",
          kind: "other_job",
          createdAt: new Date("2024-01-01T12:00:00Z"),
        } as any,
        {
          id: "job-2",
          kind: "normalize_google_event",
          createdAt: new Date("2024-01-01T11:00:00Z"),
          updatedAt: new Date("2024-01-01T11:30:00Z"),
        } as any,
        {
          id: "job-3",
          kind: "google_gmail_sync",
          createdAt: new Date("2024-01-01T10:00:00Z"),
        } as any,
      ]);

      const result = await getSyncSummaryService(mockUserId);

      expect(result.lastSyncAt).toBe("2024-01-01T11:30:00Z");
    });

    it("should handle empty recent jobs list", async () => {
      vi.mocked(jobProcessingService.getJobSummaryService).mockResolvedValue({
        pending: 0,
        processing: 0,
        retrying: 0,
        failed: 0,
      });

      vi.mocked(jobProcessingService.listRecentJobsService).mockResolvedValue([]);

      const result = await getSyncSummaryService(mockUserId);

      expect(result.lastSyncAt).toBeNull();
      expect(result.status).toBe("idle");
    });

    it("should prioritize processing status over queued", async () => {
      vi.mocked(jobProcessingService.getJobSummaryService).mockResolvedValue({
        pending: 5,
        processing: 1,
        retrying: 2,
        failed: 0,
      });

      vi.mocked(jobProcessingService.listRecentJobsService).mockResolvedValue([]);

      const result = await getSyncSummaryService(mockUserId);

      expect(result.status).toBe("processing");
    });
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GmailSyncService } from "../gmail-sync.service";
import { GoogleGmailService } from "../google-gmail.service";
import { listGmailMessageIds } from "@/server/google/gmail";
import { RawEventsRepository } from "@repo";
import { enqueue } from "@/server/jobs/enqueue";
import { logger } from "@/lib/observability";
import { google } from "googleapis";

// Mock dependencies
vi.mock("../google-gmail.service");
vi.mock("@/server/google/gmail");
vi.mock("@repo");
vi.mock("@/server/jobs/enqueue");
vi.mock("@/lib/observability");
vi.mock("googleapis");

describe("GmailSyncService", () => {
  const mockUserId = "user-123";
  const mockAuth = { credentials: { access_token: "test-token" } };
  const mockGmail = {
    users: {
      messages: {
        get: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(logger.info).mockResolvedValue();
    vi.mocked(logger.error).mockResolvedValue();
    vi.mocked(GoogleGmailService.getAuth).mockResolvedValue(mockAuth as any);
    vi.mocked(google.gmail).mockReturnValue(mockGmail as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("syncGmail", () => {
    const mockMessageIds = ["msg-1", "msg-2", "msg-3"];
    const mockMessage = {
      id: "msg-1",
      threadId: "thread-1",
      labelIds: ["INBOX"],
      snippet: "Test email",
      payload: {
        headers: [
          { name: "From", value: "sender@example.com" },
          { name: "To", value: "recipient@example.com" },
          { name: "Subject", value: "Test Subject" },
          { name: "Date", value: "Mon, 1 Jan 2024 12:00:00 +0000" },
        ],
        body: {
          data: "VGVzdCBib2R5",
        },
      },
      internalDate: "1704110400000",
    };

    beforeEach(() => {
      vi.mocked(listGmailMessageIds).mockResolvedValue({
        ids: mockMessageIds,
        pages: 1,
      });

      mockGmail.users.messages.get.mockResolvedValue({
        data: mockMessage,
      });

      vi.mocked(RawEventsRepository.upsertRawEvent).mockResolvedValue({
        id: "raw-event-1",
        userId: mockUserId,
        provider: "gmail",
        sourceId: "msg-1",
        eventType: "email_received",
        rawPayload: mockMessage,
        processedAt: null,
        createdAt: new Date(),
        batchId: "batch-1",
      });

      vi.mocked(enqueue).mockResolvedValue({ id: "job-1" } as any);
    });

    it("should successfully sync Gmail messages", async () => {
      const result = await GmailSyncService.syncGmail(mockUserId);

      expect(result).toMatchObject({
        message: expect.stringContaining("Gmail sync completed"),
        stats: {
          totalFound: mockMessageIds.length,
          processed: mockMessageIds.length,
          inserted: mockMessageIds.length,
          errors: 0,
          batchId: expect.any(String),
        },
      });
    });

    it("should use correct authentication", async () => {
      await GmailSyncService.syncGmail(mockUserId);

      expect(GoogleGmailService.getAuth).toHaveBeenCalledWith(mockUserId);
      expect(google.gmail).toHaveBeenCalledWith({ version: "v1", auth: mockAuth });
    });

    it("should build incremental query by default", async () => {
      await GmailSyncService.syncGmail(mockUserId);

      expect(listGmailMessageIds).toHaveBeenCalledWith(
        mockGmail,
        expect.stringContaining("after:"),
        mockUserId,
      );
    });

    it("should build full sync query when incremental is false", async () => {
      await GmailSyncService.syncGmail(mockUserId, { incremental: false, daysBack: 30 });

      expect(listGmailMessageIds).toHaveBeenCalledWith(
        mockGmail,
        expect.any(String),
        mockUserId,
      );
    });

    it("should handle overlap hours correctly", async () => {
      await GmailSyncService.syncGmail(mockUserId, { overlapHours: 2 });

      expect(listGmailMessageIds).toHaveBeenCalled();
    });

    it("should process messages in batches", async () => {
      const largeMessageList = Array.from({ length: 150 }, (_, i) => `msg-${i}`);
      vi.mocked(listGmailMessageIds).mockResolvedValue({
        ids: largeMessageList,
        pages: 2,
      });

      await GmailSyncService.syncGmail(mockUserId);

      expect(mockGmail.users.messages.get).toHaveBeenCalledTimes(largeMessageList.length);
    });

    it("should handle message fetch errors gracefully", async () => {
      mockGmail.users.messages.get
        .mockResolvedValueOnce({ data: mockMessage })
        .mockRejectedValueOnce(new Error("Fetch failed"))
        .mockResolvedValueOnce({ data: mockMessage });

      const result = await GmailSyncService.syncGmail(mockUserId);

      expect(result.stats.errors).toBe(1);
      expect(result.stats.processed).toBe(3);
    });

    it("should enqueue normalization jobs for inserted events", async () => {
      await GmailSyncService.syncGmail(mockUserId);

      expect(enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "normalize_events",
          userId: mockUserId,
          batchId: expect.any(String),
        }),
        expect.objectContaining({
          priority: 5,
        }),
      );
    });

    it("should not enqueue jobs when no events inserted", async () => {
      vi.mocked(listGmailMessageIds).mockResolvedValue({
        ids: [],
        pages: 0,
      });

      await GmailSyncService.syncGmail(mockUserId);

      expect(enqueue).not.toHaveBeenCalled();
    });

    it("should log sync progress appropriately", async () => {
      await GmailSyncService.syncGmail(mockUserId);

      expect(logger.info).toHaveBeenCalledWith(
        "Gmail sync started",
        expect.objectContaining({
          operation: "gmail_sync",
          additionalData: expect.objectContaining({
            userId: mockUserId,
          }),
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Gmail sync completed",
        expect.objectContaining({
          operation: "gmail_sync",
        }),
      );
    });

    it("should handle Gmail API rate limits with pacing", async () => {
      const messageIds = Array.from({ length: 100 }, (_, i) => `msg-${i}`);
      vi.mocked(listGmailMessageIds).mockResolvedValue({
        ids: messageIds,
        pages: 1,
      });

      const startTime = Date.now();
      await GmailSyncService.syncGmail(mockUserId);
      const duration = Date.now() - startTime;

      // Should have some delay due to pacing
      expect(duration).toBeGreaterThan(0);
    });

    it("should mark direct mode in logs when specified", async () => {
      await GmailSyncService.syncGmail(mockUserId, { direct: true });

      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          additionalData: expect.objectContaining({
            mode: "direct",
          }),
        }),
      );
    });
  });

  describe("syncGmailDirect", () => {
    beforeEach(() => {
      vi.mocked(listGmailMessageIds).mockResolvedValue({
        ids: ["msg-1"],
        pages: 1,
      });

      mockGmail.users.messages.get.mockResolvedValue({
        data: {
          id: "msg-1",
          threadId: "thread-1",
          labelIds: ["INBOX"],
          snippet: "Test",
          payload: {
            headers: [
              { name: "From", value: "test@example.com" },
              { name: "Subject", value: "Test" },
            ],
            body: { data: "VGVzdA==" },
          },
          internalDate: "1704110400000",
        },
      });

      vi.mocked(RawEventsRepository.upsertRawEvent).mockResolvedValue({
        id: "raw-event-1",
        userId: mockUserId,
        provider: "gmail",
        sourceId: "msg-1",
        eventType: "email_received",
        rawPayload: {},
        processedAt: null,
        createdAt: new Date(),
        batchId: "batch-1",
      });
    });

    it("should sync with direct flag enabled", async () => {
      const result = await GmailSyncService.syncGmailDirect(mockUserId);

      expect(result).toMatchObject({
        message: expect.stringContaining("sync completed"),
        stats: {
          totalFound: 1,
          processed: 1,
          inserted: 1,
          errors: 0,
        },
      });
    });

    it("should use direct mode in logs", async () => {
      await GmailSyncService.syncGmailDirect(mockUserId);

      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          additionalData: expect.objectContaining({
            mode: "direct",
          }),
        }),
      );
    });
  });

  describe("testGmailIngestion", () => {
    beforeEach(() => {
      vi.mocked(listGmailMessageIds).mockResolvedValue({
        ids: ["msg-1", "msg-2"],
        pages: 1,
      });

      mockGmail.users.messages.get.mockResolvedValue({
        data: {
          id: "msg-1",
          threadId: "thread-1",
          labelIds: ["INBOX"],
          snippet: "Test",
          payload: {
            headers: [
              { name: "From", value: "test@example.com" },
              { name: "Subject", value: "Test" },
            ],
            body: { data: "VGVzdA==" },
          },
          internalDate: "1704110400000",
        },
      });

      vi.mocked(RawEventsRepository.upsertRawEvent).mockResolvedValue({
        id: "raw-event-1",
        userId: mockUserId,
        provider: "gmail",
        sourceId: "msg-1",
        eventType: "email_received",
        rawPayload: {},
        processedAt: null,
        createdAt: new Date(),
        batchId: "batch-1",
      });
    });

    it("should test ingestion with limited sample", async () => {
      const result = await GmailSyncService.testGmailIngestion(mockUserId);

      expect(result.stats.totalFound).toBeLessThanOrEqual(10); // Default sample size
    });

    it("should respect custom sample size", async () => {
      await GmailSyncService.testGmailIngestion(mockUserId, 5);

      expect(listGmailMessageIds).toHaveBeenCalled();
    });
  });

  describe("bulkGmailIngestion", () => {
    beforeEach(() => {
      const messageIds = Array.from({ length: 50 }, (_, i) => `msg-${i}`);
      vi.mocked(listGmailMessageIds).mockResolvedValue({
        ids: messageIds,
        pages: 1,
      });

      mockGmail.users.messages.get.mockResolvedValue({
        data: {
          id: "msg-1",
          threadId: "thread-1",
          labelIds: ["INBOX"],
          snippet: "Test",
          payload: {
            headers: [
              { name: "From", value: "test@example.com" },
              { name: "Subject", value: "Test" },
            ],
            body: { data: "VGVzdA==" },
          },
          internalDate: "1704110400000",
        },
      });

      vi.mocked(RawEventsRepository.upsertRawEvent).mockResolvedValue({
        id: "raw-event-1",
        userId: mockUserId,
        provider: "gmail",
        sourceId: "msg-1",
        eventType: "email_received",
        rawPayload: {},
        processedAt: null,
        createdAt: new Date(),
        batchId: "batch-1",
      });
    });

    it("should perform bulk ingestion", async () => {
      const result = await GmailSyncService.bulkGmailIngestion(mockUserId, 365);

      expect(result.stats.totalFound).toBe(50);
      expect(result.stats.processed).toBe(50);
    });

    it("should use specified daysBack parameter", async () => {
      await GmailSyncService.bulkGmailIngestion(mockUserId, 90);

      expect(listGmailMessageIds).toHaveBeenCalled();
    });
  });

  describe("getIngestionStats", () => {
    beforeEach(() => {
      vi.mocked(RawEventsRepository.countRawEventsByUser).mockResolvedValue(150);
      vi.mocked(RawEventsRepository.getLatestRawEventDate).mockResolvedValue(
        new Date("2024-01-15"),
      );
    });

    it("should return ingestion statistics", async () => {
      const stats = await GmailSyncService.getIngestionStats(mockUserId);

      expect(stats).toMatchObject({
        totalIngested: 150,
        lastIngestedAt: expect.any(Date),
        provider: "gmail",
      });
    });

    it("should handle users with no ingested events", async () => {
      vi.mocked(RawEventsRepository.countRawEventsByUser).mockResolvedValue(0);
      vi.mocked(RawEventsRepository.getLatestRawEventDate).mockResolvedValue(null);

      const stats = await GmailSyncService.getIngestionStats(mockUserId);

      expect(stats).toMatchObject({
        totalIngested: 0,
        lastIngestedAt: null,
        provider: "gmail",
      });
    });
  });
});
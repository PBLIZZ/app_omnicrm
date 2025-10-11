/**
 * Unit tests for GmailSyncService
 * - Validates query building (incremental vs fallback)
 * - Verifies ingestion and enqueue behavior
 * - Checks ingestion stats aggregation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GmailSyncService } from "../gmail-sync.service";

// Mocks
vi.mock("@/server/services/google-gmail.service", () => ({
  GoogleGmailService: {
    getAuth: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("googleapis", () => {
  const gmail = vi.fn(); // configurable per-test
  return { google: { gmail }, gmail_v1: {} as any };
});

vi.mock("@/server/google/gmail", () => ({
  listGmailMessageIds: vi.fn().mockResolvedValue({ ids: [], pages: 0 }),
}));

vi.mock("@repo", () => ({
  RawEventsRepository: {
    listRawEvents: vi.fn(),
    createBulkRawEvents: vi.fn(),
    createRawEvent: vi.fn(),
    countRawEvents: vi.fn(),
  },
}));

vi.mock("@/server/jobs/enqueue", () => ({
  enqueue: vi.fn(),
}));

describe("GmailSyncService", () => {
  const userId = "user-abc-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses fallback newer_than when no latest Gmail event (incremental=true)", async () => {
    const { google } = await import("googleapis");
    // gmail client mock with minimal surface used by service
    vi.mocked(google.gmail).mockReturnValue({
      users: { messages: { get: vi.fn(), list: vi.fn() } },
    } as any);

    const { listGmailMessageIds } = await import("@/server/google/gmail");
    const { RawEventsRepository } = await import("@repo");

    vi.mocked(RawEventsRepository.listRawEvents).mockResolvedValueOnce([]); // no prior events
    vi.mocked(listGmailMessageIds).mockResolvedValueOnce({ ids: [], pages: 1 });

    await GmailSyncService.syncGmail(userId, { incremental: true, overlapHours: 2 });

    expect(listGmailMessageIds).toHaveBeenCalledTimes(1);
    const call = vi.mocked(listGmailMessageIds).mock.calls[0];
    // call signature: (gmail, query, userId)
    expect(call[2]).toBe(userId);
    expect(String(call[1])).toContain("newer_than:"); // 365d default fallback
  });

  it("builds incremental after:YYYY/MM/DD when latest event exists and overlap applied", async () => {
    const { google } = await import("googleapis");
    vi.mocked(google.gmail).mockReturnValue({
      users: { messages: { get: vi.fn(), list: vi.fn() } },
    } as any);

    const { listGmailMessageIds } = await import("@/server/google/gmail");
    const { RawEventsRepository } = await import("@repo");

    // Latest createdAt date exists
    vi.mocked(RawEventsRepository.listRawEvents).mockResolvedValueOnce([
      { createdAt: new Date("2025-01-15T12:00:00Z") },
    ] as any);
    vi.mocked(listGmailMessageIds).mockResolvedValueOnce({ ids: [], pages: 1 });

    await GmailSyncService.syncGmail(userId, { incremental: true, overlapHours: 2 });

    const call = vi.mocked(listGmailMessageIds).mock.calls[0];
    expect(call[2]).toBe(userId);
    // Expect "after:YYYY/MM/DD" (day resolution, overlap doesn't change the day in this case)
    expect(String(call[1])).toMatch(/^after:\d{4}\/\d{2}\/\d{2}$/);
  });

  it("enqueues normalization job when inserted > 0", async () => {
    const { google } = await import("googleapis");
    const messageGet = vi.fn()
      .mockResolvedValueOnce({ data: { id: "m1", internalDate: String(Date.now()), labelIds: ["INBOX"] } })
      .mockResolvedValueOnce({ data: { id: "m2", internalDate: String(Date.now()), labelIds: ["INBOX"] } });
    vi.mocked(google.gmail).mockReturnValue({
      users: { messages: { get: messageGet, list: vi.fn() } },
    } as any);

    const { listGmailMessageIds } = await import("@/server/google/gmail");
    const { RawEventsRepository } = await import("@repo");
    const { enqueue } = await import("@/server/jobs/enqueue");

    // no prior events => fallback window
    vi.mocked(RawEventsRepository.listRawEvents).mockResolvedValueOnce([]);
    // 2 ids returned
    vi.mocked(listGmailMessageIds).mockResolvedValueOnce({ ids: ["m1", "m2"], pages: 1 });
    // bulk upsert succeeds
    vi.mocked(RawEventsRepository.createBulkRawEvents).mockResolvedValueOnce(undefined);

    const result = await GmailSyncService.syncGmail(userId, { incremental: false, daysBack: 30 });

    expect(messageGet).toHaveBeenCalledTimes(2);
    expect(result.stats.inserted).toBe(2);
    expect(enqueue).toHaveBeenCalledTimes(1);
    // job name and userId are verifiable; batchId is random UUID
    expect(vi.mocked(enqueue).mock.calls[0][0]).toBe("normalize_google_email");
    expect(vi.mocked(enqueue).mock.calls[0][2]).toBe(userId);
  });

  it("returns ingestion stats computed via repository", async () => {
    const { RawEventsRepository } = await import("@repo");

    // First count: total events
    vi.mocked(RawEventsRepository.countRawEvents)
      .mockResolvedValueOnce(1000) // total
      .mockResolvedValueOnce(50);  // recent

    // listRawEvents to find lastIngestionAt
    vi.mocked(RawEventsRepository.listRawEvents).mockResolvedValueOnce([
      { createdAt: new Date("2025-01-15T09:30:00Z") },
    ] as any);

    const res = await GmailSyncService.getIngestionStats(userId, "gmail");
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.totalEvents).toBe(1000);
      expect(res.data.recentEvents).toBe(50);
      expect(res.data.lastIngestionAt).toBeInstanceOf(Date);
    }
  });

  it("testGmailIngestion returns success summary", async () => {
    const { google } = await import("googleapis");
    const list = vi.fn().mockResolvedValue({ data: { messages: [{ id: "a" }, { id: "b" }] } });
    const get = vi.fn()
      .mockResolvedValueOnce({ data: { id: "a", internalDate: String(Date.now()) } })
      .mockResolvedValueOnce({ data: { id: "b", internalDate: String(Date.now()) } });
    vi.mocked(google.gmail).mockReturnValue({
      users: { messages: { list, get } },
    } as any);

    const { RawEventsRepository } = await import("@repo");
    vi.mocked(RawEventsRepository.createBulkRawEvents).mockResolvedValueOnce(undefined);

    const out = await GmailSyncService.testGmailIngestion(userId);
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.data.totalMessages).toBe(2);
      expect(out.data.successCount).toBe(2);
      expect(out.data.failureCount).toBe(0);
    }
  });
});
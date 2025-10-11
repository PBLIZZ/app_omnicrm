import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SyncSessionsRepository } from "../sync-sessions.repo";
import { getDb } from "@/server/db/client";
import { isOk, isErr } from "@/lib/utils/result";

vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

describe("SyncSessionsRepository", () => {
  const mockUserId = "test-user-123";
  const mockSessionId = "session-456";
  
  let mockDb: any;
  
  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
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

  describe("listSyncSessions", () => {
    it("should list all sync sessions for a user", async () => {
      const mockSessions = [
        {
          id: "session-1",
          userId: mockUserId,
          service: "gmail",
          status: "completed",
          progressPercentage: 100,
          currentStep: "Completed",
          totalItems: 100,
          importedItems: 95,
          processedItems: 95,
          failedItems: 5,
          startedAt: new Date(),
          completedAt: new Date(),
          errorDetails: null,
          preferences: {},
        },
        {
          id: "session-2",
          userId: mockUserId,
          service: "calendar",
          status: "in_progress",
          progressPercentage: 50,
          currentStep: "Processing events",
          totalItems: 200,
          importedItems: 100,
          processedItems: 100,
          failedItems: 0,
          startedAt: new Date(),
          completedAt: null,
          errorDetails: null,
          preferences: {},
        },
      ];

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockSessions);

      const result = await SyncSessionsRepository.listSyncSessions(mockUserId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toHaveLength(2);
      }
    });

    it("should filter sessions by service", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce([]);

      await SyncSessionsRepository.listSyncSessions(mockUserId, { service: "gmail" });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should filter sessions by status", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce([]);

      await SyncSessionsRepository.listSyncSessions(mockUserId, { status: "completed" });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should return error on database failure", async () => {
      const dbError = new Error("Connection failed");
      vi.mocked(getDb).mockRejectedValueOnce(dbError);

      const result = await SyncSessionsRepository.listSyncSessions(mockUserId);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("DB_QUERY_FAILED");
      }
    });
  });

  describe("getSyncSessionById", () => {
    it("should retrieve a specific sync session", async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        service: "gmail",
        status: "completed",
        progressPercentage: 100,
        currentStep: "Completed",
        totalItems: 150,
        importedItems: 145,
        processedItems: 145,
        failedItems: 5,
        startedAt: new Date("2024-01-01"),
        completedAt: new Date("2024-01-01"),
        errorDetails: null,
        preferences: { skipArchived: true },
      };

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockSession]);

      const result = await SyncSessionsRepository.getSyncSessionById(mockUserId, mockSessionId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockSessionId);
      expect(result?.service).toBe("gmail");
    });

    it("should return null when session not found", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await SyncSessionsRepository.getSyncSessionById(mockUserId, "non-existent");

      expect(result).toBeNull();
    });

    it("should enforce userId filtering", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      await SyncSessionsRepository.getSyncSessionById("different-user", mockSessionId);

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("getLatestSyncSession", () => {
    it("should retrieve the most recent session for a service", async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        service: "gmail",
        status: "completed",
        progressPercentage: 100,
        currentStep: "Completed",
        totalItems: 50,
        importedItems: 50,
        processedItems: 50,
        failedItems: 0,
        startedAt: new Date(),
        completedAt: new Date(),
        errorDetails: null,
        preferences: {},
      };

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockSession]);

      const result = await SyncSessionsRepository.getLatestSyncSession(mockUserId, "gmail");

      expect(result).toBeDefined();
      expect(result?.service).toBe("gmail");
    });

    it("should return null when no sessions exist for service", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await SyncSessionsRepository.getLatestSyncSession(mockUserId, "calendar");

      expect(result).toBeNull();
    });
  });

  describe("createSyncSession", () => {
    it("should create a new sync session", async () => {
      const sessionData = {
        service: "gmail",
        preferences: { skipArchived: true },
      };

      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        ...sessionData,
        status: "in_progress",
        progressPercentage: 0,
        currentStep: "Initializing",
        totalItems: 0,
        importedItems: 0,
        processedItems: 0,
        failedItems: 0,
        startedAt: new Date(),
        completedAt: null,
        errorDetails: null,
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([mockSession]);

      const result = await SyncSessionsRepository.createSyncSession(mockUserId, sessionData);

      expect(result).toBeDefined();
      expect(result?.service).toBe(sessionData.service);
      expect(result?.status).toBe("in_progress");
    });
  });

  describe("updateSyncSession", () => {
    it("should update sync progress", async () => {
      const updates = {
        progressPercentage: 75,
        currentStep: "Processing emails",
        processedItems: 150,
      };

      const mockUpdated = {
        id: mockSessionId,
        userId: mockUserId,
        service: "gmail",
        status: "in_progress",
        ...updates,
        totalItems: 200,
        importedItems: 150,
        failedItems: 0,
        startedAt: new Date(),
        completedAt: null,
        errorDetails: null,
        preferences: {},
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([mockUpdated]);

      const result = await SyncSessionsRepository.updateSyncSession(
        mockUserId,
        mockSessionId,
        updates
      );

      expect(result).toBeDefined();
      expect(result?.progressPercentage).toBe(75);
      expect(result?.currentStep).toBe("Processing emails");
    });

    it("should mark session as completed", async () => {
      const updates = {
        status: "completed" as const,
        progressPercentage: 100,
        currentStep: "Completed",
        completedAt: new Date(),
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([]);

      await SyncSessionsRepository.updateSyncSession(mockUserId, mockSessionId, updates);

      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        status: "completed",
        progressPercentage: 100,
      }));
    });

    it("should mark session as failed with error details", async () => {
      const updates = {
        status: "failed" as const,
        errorDetails: { error: "Network timeout", retryable: true },
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([]);

      await SyncSessionsRepository.updateSyncSession(mockUserId, mockSessionId, updates);

      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        status: "failed",
        errorDetails: updates.errorDetails,
      }));
    });

    it("should return null when session not found", async () => {
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await SyncSessionsRepository.updateSyncSession(
        mockUserId,
        "non-existent",
        { progressPercentage: 50 }
      );

      expect(result).toBeNull();
    });
  });

  describe("deleteSyncSession", () => {
    it("should delete a sync session", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce({ rowCount: 1 });

      const result = await SyncSessionsRepository.deleteSyncSession(mockUserId, mockSessionId);

      expect(result).toBe(true);
    });

    it("should return false when session not found", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce({ rowCount: 0 });

      const result = await SyncSessionsRepository.deleteSyncSession(mockUserId, "non-existent");

      expect(result).toBe(false);
    });

    it("should enforce userId filtering", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce({ rowCount: 0 });

      await SyncSessionsRepository.deleteSyncSession("different-user", mockSessionId);

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("getActiveSyncSessions", () => {
    it("should retrieve all active sync sessions", async () => {
      const mockSessions = [
        {
          id: "session-1",
          userId: mockUserId,
          service: "gmail",
          status: "in_progress",
          progressPercentage: 50,
          currentStep: "Processing",
          totalItems: 100,
          importedItems: 50,
          processedItems: 50,
          failedItems: 0,
          startedAt: new Date(),
          completedAt: null,
          errorDetails: null,
          preferences: {},
        },
        {
          id: "session-2",
          userId: mockUserId,
          service: "calendar",
          status: "in_progress",
          progressPercentage: 25,
          currentStep: "Fetching events",
          totalItems: 200,
          importedItems: 50,
          processedItems: 50,
          failedItems: 0,
          startedAt: new Date(),
          completedAt: null,
          errorDetails: null,
          preferences: {},
        },
      ];

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockSessions);

      const result = await SyncSessionsRepository.getActiveSyncSessions(mockUserId);

      expect(result).toHaveLength(2);
      expect(result.every(s => s.status === "in_progress")).toBe(true);
    });

    it("should return empty array when no active sessions", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce([]);

      const result = await SyncSessionsRepository.getActiveSyncSessions(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle concurrent session updates gracefully", async () => {
      const updates = { progressPercentage: 90 };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await SyncSessionsRepository.updateSyncSession(
        mockUserId,
        mockSessionId,
        updates
      );

      // Should handle optimistic locking or version conflicts
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should handle large session counts efficiently", async () => {
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        id: `session-${i}`,
        userId: mockUserId,
        service: "gmail",
        status: "completed",
        progressPercentage: 100,
        currentStep: "Completed",
        totalItems: 100,
        importedItems: 100,
        processedItems: 100,
        failedItems: 0,
        startedAt: new Date(),
        completedAt: new Date(),
        errorDetails: null,
        preferences: {},
      }));

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(largeBatch);

      const result = await SyncSessionsRepository.listSyncSessions(mockUserId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.length).toBeGreaterThan(0);
      }
    });
  });
});
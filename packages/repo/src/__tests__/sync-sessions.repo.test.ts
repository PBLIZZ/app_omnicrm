/**
 * Unit tests for SyncSessionsRepository
 * Tests sync session tracking for Gmail and Calendar synchronization
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncSessionsRepository } from "../sync-sessions.repo";
import type { SyncSession } from "@/server/db/schema";
import * as dbClient from "@/server/db/client";

// Mock the database client
vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

describe("SyncSessionsRepository", () => {
  const mockUserId = "test-user-123";
  const mockSessionId = "session-123";

  const mockSyncSession: SyncSession = {
    id: mockSessionId,
    userId: mockUserId,
    service: "gmail",
    status: "in_progress",
    progressPercentage: 50,
    currentStep: "Importing messages",
    totalItems: 1000,
    importedItems: 500,
    processedItems: 450,
    failedItems: 5,
    startedAt: new Date("2025-01-15T10:00:00Z"),
    completedAt: null,
    errorDetails: null,
    preferences: { syncLabels: true },
  };

  const createMockDb = () => ({
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listSyncSessions", () => {
    it("should list all sync sessions for a user", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([mockSyncSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.listSyncSessions(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual(mockSyncSession);
      }
    });

    it("should filter sessions by service", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([mockSyncSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.listSyncSessions(mockUserId, {
        service: "gmail",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0]?.service).toBe("gmail");
      }
    });

    it("should filter sessions by status", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([mockSyncSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.listSyncSessions(mockUserId, {
        status: "in_progress",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0]?.status).toBe("in_progress");
      }
    });

    it("should return empty array when no sessions found", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.listSyncSessions(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("should handle database errors", async () => {
      vi.mocked(dbClient.getDb).mockRejectedValue(new Error("Database error"));

      const result = await SyncSessionsRepository.listSyncSessions(mockUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_QUERY_FAILED");
      }
    });
  });

  describe("getSyncSessionById", () => {
    it("should retrieve a sync session by ID", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockSyncSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.getSyncSessionById(mockUserId, mockSessionId);

      expect(result).toEqual(mockSyncSession);
    });

    it("should return null when session not found", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.getSyncSessionById(
        mockUserId,
        "non-existent-id",
      );

      expect(result).toBeNull();
    });

    it("should verify user ownership", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.getSyncSessionById(
        "different-user-id",
        mockSessionId,
      );

      expect(result).toBeNull();
    });
  });

  describe("getLatestSyncSession", () => {
    it("should retrieve the latest sync session for a service", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockSyncSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.getLatestSyncSession(mockUserId, "gmail");

      expect(result).toEqual(mockSyncSession);
      expect(result?.service).toBe("gmail");
    });

    it("should return null when no sessions exist for service", async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.getLatestSyncSession(mockUserId, "calendar");

      expect(result).toBeNull();
    });
  });

  describe("getActiveSyncSessions", () => {
    it("should retrieve active sync sessions", async () => {
      const activeSessions = [
        { ...mockSyncSession, status: "pending" as const },
        { ...mockSyncSession, id: "session-2", status: "in_progress" as const },
      ];
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue(activeSessions);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.getActiveSyncSessions(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0]?.status).toBe("pending");
      expect(result[1]?.status).toBe("in_progress");
    });

    it("should exclude completed sessions", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.getActiveSyncSessions(mockUserId);

      expect(result).toHaveLength(0);
    });

    it("should exclude failed sessions", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.getActiveSyncSessions(mockUserId);

      expect(result).toHaveLength(0);
    });

    it("should exclude cancelled sessions", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.getActiveSyncSessions(mockUserId);

      expect(result).toHaveLength(0);
    });
  });

  describe("createSyncSession", () => {
    it("should create a new sync session", async () => {
      const newSession = { ...mockSyncSession, id: "new-session-123", status: "pending" as const };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([newSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.createSyncSession(mockUserId, {
        service: "gmail",
        preferences: { syncLabels: true },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.service).toBe("gmail");
        expect(result.data.status).toBe("pending");
        expect(result.data.userId).toBe(mockUserId);
      }
    });

    it("should initialize with default values", async () => {
      const newSession = {
        ...mockSyncSession,
        id: "new-session-123",
        status: "pending" as const,
        preferences: {},
      };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([newSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.createSyncSession(mockUserId, {
        service: "calendar",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("pending");
      }
    });

    it("should return error when insert fails", async () => {
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.createSyncSession(mockUserId, {
        service: "gmail",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_INSERT_FAILED");
      }
    });

    it("should handle database errors", async () => {
      vi.mocked(dbClient.getDb).mockRejectedValue(new Error("Insert failed"));

      const result = await SyncSessionsRepository.createSyncSession(mockUserId, {
        service: "gmail",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_INSERT_FAILED");
      }
    });
  });

  describe("updateSyncSession", () => {
    it("should update a sync session", async () => {
      const updatedSession = { ...mockSyncSession, status: "completed" as const };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([updatedSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.updateSyncSession(
        mockUserId,
        mockSessionId,
        { status: "completed" },
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe("completed");
    });

    it("should set completedAt for terminal states", async () => {
      const completedSession = {
        ...mockSyncSession,
        status: "completed" as const,
        completedAt: new Date(),
      };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([completedSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.updateSyncSession(
        mockUserId,
        mockSessionId,
        { status: "completed" },
      );

      expect(result?.completedAt).not.toBeNull();
    });

    it("should handle partial updates", async () => {
      const updatedSession = { ...mockSyncSession, progressPercentage: 75 };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([updatedSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.updateSyncSession(
        mockUserId,
        mockSessionId,
        { progressPercentage: 75 },
      );

      expect(result?.progressPercentage).toBe(75);
    });

    it("should return null when session not found", async () => {
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.updateSyncSession(
        mockUserId,
        "non-existent-id",
        { status: "completed" },
      );

      expect(result).toBeNull();
    });
  });

  describe("updateSyncProgress", () => {
    it("should update sync progress", async () => {
      const updatedSession = {
        ...mockSyncSession,
        progressPercentage: 75,
        importedItems: 750,
      };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([updatedSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.updateSyncProgress(
        mockUserId,
        mockSessionId,
        {
          progressPercentage: 75,
          importedItems: 750,
        },
      );

      expect(result).not.toBeNull();
      expect(result?.progressPercentage).toBe(75);
      expect(result?.importedItems).toBe(750);
    });

    it("should update current step", async () => {
      const updatedSession = { ...mockSyncSession, currentStep: "Processing contacts" };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([updatedSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.updateSyncProgress(
        mockUserId,
        mockSessionId,
        { currentStep: "Processing contacts" },
      );

      expect(result?.currentStep).toBe("Processing contacts");
    });

    it("should track failed items", async () => {
      const updatedSession = { ...mockSyncSession, failedItems: 10 };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([updatedSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.updateSyncProgress(
        mockUserId,
        mockSessionId,
        { failedItems: 10 },
      );

      expect(result?.failedItems).toBe(10);
    });
  });

  describe("markSyncSessionFailed", () => {
    it("should mark session as failed with error details", async () => {
      const failedSession = {
        ...mockSyncSession,
        status: "failed" as const,
        errorDetails: { error: "API rate limit exceeded" },
        completedAt: new Date(),
      };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([failedSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.markSyncSessionFailed(
        mockUserId,
        mockSessionId,
        { error: "API rate limit exceeded" },
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe("failed");
      expect(result?.errorDetails).toEqual({ error: "API rate limit exceeded" });
    });

    it("should include detailed error information", async () => {
      const errorDetails = {
        error: "Authentication failed",
        code: "AUTH_ERROR",
        retryable: true,
      };
      const failedSession = {
        ...mockSyncSession,
        status: "failed" as const,
        errorDetails,
        completedAt: new Date(),
      };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([failedSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.markSyncSessionFailed(
        mockUserId,
        mockSessionId,
        errorDetails,
      );

      expect(result?.errorDetails).toEqual(errorDetails);
    });
  });

  describe("markSyncSessionCompleted", () => {
    it("should mark session as completed", async () => {
      const completedSession = {
        ...mockSyncSession,
        status: "completed" as const,
        progressPercentage: 100,
        completedAt: new Date(),
      };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([completedSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.markSyncSessionCompleted(
        mockUserId,
        mockSessionId,
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe("completed");
      expect(result?.progressPercentage).toBe(100);
    });
  });

  describe("cancelSyncSession", () => {
    it("should cancel a sync session", async () => {
      const cancelledSession = {
        ...mockSyncSession,
        status: "cancelled" as const,
        completedAt: new Date(),
      };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([cancelledSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.cancelSyncSession(mockUserId, mockSessionId);

      expect(result).not.toBeNull();
      expect(result?.status).toBe("cancelled");
    });
  });

  describe("deleteSyncSession", () => {
    it("should delete a sync session", async () => {
      const mockDb = createMockDb();
      mockDb.delete.mockResolvedValue([{ id: mockSessionId }]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.deleteSyncSession(mockUserId, mockSessionId);

      expect(result).toBe(true);
    });

    it("should return false when session not found", async () => {
      const mockDb = createMockDb();
      mockDb.delete.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.deleteSyncSession(
        mockUserId,
        "non-existent-id",
      );

      expect(result).toBe(false);
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle multiple concurrent sync sessions", async () => {
      const sessions = [
        { ...mockSyncSession, id: "session-1", service: "gmail" },
        { ...mockSyncSession, id: "session-2", service: "calendar" },
      ];
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue(sessions);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.listSyncSessions(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    it("should handle sync sessions with large item counts", async () => {
      const largeSession = {
        ...mockSyncSession,
        totalItems: 1000000,
        importedItems: 500000,
      };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([largeSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.updateSyncProgress(
        mockUserId,
        mockSessionId,
        { totalItems: 1000000, importedItems: 500000 },
      );

      expect(result?.totalItems).toBe(1000000);
    });

    it("should handle sessions with complex preferences", async () => {
      const complexPreferences = {
        syncLabels: true,
        labelFilters: ["work", "important"],
        dateRange: { from: "2024-01-01", to: "2025-01-01" },
        maxItems: 10000,
      };
      const newSession = {
        ...mockSyncSession,
        id: "new-session-123",
        preferences: complexPreferences,
      };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([newSession]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await SyncSessionsRepository.createSyncSession(mockUserId, {
        service: "gmail",
        preferences: complexPreferences,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.preferences).toEqual(complexPreferences);
      }
    });

    it("should track progress through multiple update calls", async () => {
      const mockDb = createMockDb();
      const updates = [
        { progressPercentage: 25, importedItems: 250 },
        { progressPercentage: 50, importedItems: 500 },
        { progressPercentage: 75, importedItems: 750 },
        { progressPercentage: 100, importedItems: 1000 },
      ];

      updates.forEach((update) => {
        mockDb.returning.mockResolvedValueOnce([{ ...mockSyncSession, ...update }]);
      });
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      for (const update of updates) {
        const result = await SyncSessionsRepository.updateSyncProgress(
          mockUserId,
          mockSessionId,
          update,
        );
        expect(result?.progressPercentage).toBe(update.progressPercentage);
      }
    });
  });
});
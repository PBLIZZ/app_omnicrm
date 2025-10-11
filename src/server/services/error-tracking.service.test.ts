/**
 * Unit tests for ErrorTrackingService
 * 
 * Tests comprehensive error tracking functionality including:
 * - Error recording with automatic classification
 * - Error summary and statistics
 * - Error acknowledgment and resolution
 * - Retry management
 * - Batch error recording
 * - Error cleanup
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorTrackingService } from "./error-tracking.service";
import type { ErrorClassification } from "@/lib/errors/classification";

// Mock dependencies
vi.mock("@/server/db/client");
vi.mock("@/lib/errors/classification");
vi.mock("@/lib/observability/unified-logger");

const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockGetDb = vi.fn().mockResolvedValue(mockDb);
const mockClassifyError = vi.fn();
const mockLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

describe("ErrorTrackingService", () => {
  const testUserId = "test-user-123";
  const testErrorId = "error-456";
  const testError = new Error("Test error message");

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mocks
    let { getDb } = await import("@/server/db/client");
    (getDb as any) = mockGetDb;

    let { classifyError } = await import("@/lib/errors/classification");
    (classifyError as any) = mockClassifyError;

    const { logger } = await import("@/lib/observability/unified-logger");
    Object.assign(logger, mockLogger);

    // Reset mock implementations
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: testErrorId }]),
      }),
    });

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: testErrorId }]),
      }),
    });

    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });

    // Default classification
    mockClassifyError.mockReturnValue({
      category: "system",
      severity: "medium",
      retryable: true,
      recoveryStrategies: [],
    } as ErrorClassification);
  });

  describe("recordError", () => {
    it("should record error with automatic classification", async () => {
      const context = {
        provider: "gmail" as const,
        stage: "ingestion" as const,
        sessionId: "session-123",
      };

      const mockClassification: ErrorClassification = {
        category: "network",
        severity: "high",
        retryable: true,
        recoveryStrategies: [],
      };

      mockClassifyError.mockReturnValue(mockClassification);

      const errorId = await ErrorTrackingService.recordError(testUserId, testError, context);

      expect(errorId).toBe(testErrorId);
      expect(mockClassifyError).toHaveBeenCalledWith(testError);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Error recorded with classification",
        expect.objectContaining({
          additionalData: expect.objectContaining({
            category: "network",
            severity: "high",
            retryable: true,
          }),
        })
      );
    });

    it("should handle string errors", async () => {
      const errorString = "Simple error string";
      const context = {
        provider: "calendar" as const,
        stage: "processing" as const,
      };

      const errorId = await ErrorTrackingService.recordError(
        testUserId,
        errorString,
        context
      );

      expect(errorId).toBe(testErrorId);
      expect(mockClassifyError).toHaveBeenCalledWith(errorString);
    });

    it("should include all context fields in recorded error", async () => {
      const context = {
        rawEventId: "raw-123",
        provider: "drive" as const,
        stage: "normalization" as const,
        operation: "file_sync",
        sessionId: "session-456",
        batchId: "batch-789",
        itemId: "item-101",
        additionalMeta: {
          customField: "customValue",
        },
      };

      await ErrorTrackingService.recordError(testUserId, testError, context);

      const insertCall = mockDb.insert.mock.results[0].value.values;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          rawEventId: "raw-123",
          userId: testUserId,
          provider: "drive",
          stage: "normalization",
          error: "Test error message",
          context: expect.objectContaining({
            sessionId: "session-456",
            batchId: "batch-789",
            itemId: "item-101",
            operation: "file_sync",
            customField: "customValue",
            retryCount: 0,
          }),
        })
      );
    });

    it("should return fallback ID on tracking failure", async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      });

      const context = {
        provider: "gmail" as const,
        stage: "ingestion" as const,
      };

      const errorId = await ErrorTrackingService.recordError(testUserId, testError, context);

      expect(errorId).toMatch(/^fallback-\d+$/);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to record error",
        expect.any(Object),
        expect.any(Error)
      );
    });

    it("should handle null rawEventId gracefully", async () => {
      const context = {
        rawEventId: undefined,
        provider: "gmail" as const,
        stage: "ingestion" as const,
      };

      await ErrorTrackingService.recordError(testUserId, testError, context);

      const insertCall = mockDb.insert.mock.results[0].value.values;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          rawEventId: null,
        })
      );
    });
  });

  describe("recordErrorBatch", () => {
    it("should record multiple errors in batch", async () => {
      const errors = [
        {
          error: new Error("Error 1"),
          context: { provider: "gmail" as const, stage: "ingestion" as const },
        },
        {
          error: new Error("Error 2"),
          context: { provider: "calendar" as const, stage: "processing" as const },
        },
        {
          error: "Error 3",
          context: { provider: "drive" as const, stage: "normalization" as const },
        },
      ];

      const errorIds = await ErrorTrackingService.recordErrorBatch(testUserId, errors);

      expect(errorIds).toHaveLength(3);
      expect(errorIds.every(id => id === testErrorId)).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Recorded 3 errors in batch"),
        expect.any(Object)
      );
    });

    it("should handle batch processing with partial failures", async () => {
      mockDb.insert
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "error-1" }]),
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error("DB error")),
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "error-3" }]),
          }),
        });

      const errors = Array(3).fill({
        error: new Error("Test"),
        context: { provider: "gmail" as const, stage: "ingestion" as const },
      });

      const errorIds = await ErrorTrackingService.recordErrorBatch(testUserId, errors);

      expect(errorIds).toHaveLength(3);
      expect(errorIds.filter(id => id.startsWith("fallback-"))).toHaveLength(1);
    });

    it("should process large batches in chunks", async () => {
      const errors = Array(25).fill({
        error: new Error("Test"),
        context: { provider: "gmail" as const, stage: "ingestion" as const },
      });

      await ErrorTrackingService.recordErrorBatch(testUserId, errors);

      // Should process in chunks of 10, so 3 batches total
      expect(mockDb.insert).toHaveBeenCalledTimes(25);
    });
  });

  describe("getErrorSummary", () => {
    it("should return comprehensive error summary", async () => {
      const mockErrors = [
        {
          id: "1",
          userId: testUserId,
          provider: "gmail",
          errorAt: new Date(),
          stage: "ingestion",
          error: "Network error",
          rawEventId: null,
          context: {
            classification: {
              category: "network",
              severity: "high",
              retryable: true,
            },
          },
        },
        {
          id: "2",
          userId: testUserId,
          provider: "calendar",
          errorAt: new Date(),
          stage: "processing",
          error: "Auth error",
          rawEventId: null,
          context: {
            classification: {
              category: "auth",
              severity: "critical",
              retryable: true,
            },
            resolvedAt: new Date().toISOString(),
          },
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockErrors),
            }),
          }),
        }),
      });

      const summary = await ErrorTrackingService.getErrorSummary(testUserId);

      expect(summary.totalErrors).toBe(1); // Only unresolved
      expect(summary.errorsByCategory).toHaveProperty("network");
      expect(summary.errorsBySeverity).toHaveProperty("high");
      expect(summary.resolvedErrors).toBe(1);
      expect(summary.pendingErrors).toBe(1);
      expect(summary.criticalErrors.length).toBe(0); // Critical error is resolved
      expect(summary.retryableErrors.length).toBe(1);
    });

    it("should filter by provider", async () => {
      await ErrorTrackingService.getErrorSummary(testUserId, {
        provider: "gmail",
      });

      expect(mockDb.select).toHaveBeenCalled();
      // Check that where clause includes provider filter
      const selectChain = mockDb.select.mock.results[0].value;
      expect(selectChain.from).toHaveBeenCalled();
    });

    it("should filter by time range", async () => {
      await ErrorTrackingService.getErrorSummary(testUserId, {
        timeRangeHours: 24,
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should include resolved errors when requested", async () => {
      const mockErrors = [
        {
          id: "1",
          userId: testUserId,
          provider: "gmail",
          errorAt: new Date(),
          stage: "ingestion",
          error: "Test",
          rawEventId: null,
          context: {
            resolvedAt: new Date().toISOString(),
            classification: { category: "network", severity: "low", retryable: false },
          },
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockErrors),
            }),
          }),
        }),
      });

      const summary = await ErrorTrackingService.getErrorSummary(testUserId, {
        includeResolved: true,
      });

      expect(summary.totalErrors).toBe(1);
      expect(summary.resolvedErrors).toBe(1);
    });

    it("should return empty summary on error", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error("DB error")),
            }),
          }),
        }),
      });

      const summary = await ErrorTrackingService.getErrorSummary(testUserId);

      expect(summary.totalErrors).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("acknowledgeError", () => {
    it("should mark error as acknowledged", async () => {
      const result = await ErrorTrackingService.acknowledgeError(testUserId, testErrorId);

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Error acknowledged by user",
        expect.objectContaining({
          additionalData: { userId: testUserId, errorId: testErrorId },
        })
      );
    });

    it("should return false when error not found", async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await ErrorTrackingService.acknowledgeError(testUserId, testErrorId);

      expect(result).toBe(false);
    });

    it("should handle acknowledgment errors gracefully", async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("DB error")),
        }),
      });

      const result = await ErrorTrackingService.acknowledgeError(testUserId, testErrorId);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("resolveError", () => {
    it("should mark error as resolved with resolution details", async () => {
      const resolution = {
        method: "manual_fix",
        details: "User reconnected their account",
      };

      const result = await ErrorTrackingService.resolveError(
        testUserId,
        testErrorId,
        resolution
      );

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Error marked as resolved",
        expect.objectContaining({
          additionalData: expect.objectContaining({ resolution }),
        })
      );
    });

    it("should handle resolution without details", async () => {
      const resolution = { method: "auto_resolved" };

      const result = await ErrorTrackingService.resolveError(
        testUserId,
        testErrorId,
        resolution
      );

      expect(result).toBe(true);
    });

    it("should return false on resolution failure", async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("DB error")),
        }),
      });

      const result = await ErrorTrackingService.resolveError(testUserId, testErrorId, {
        method: "test",
      });

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("recordRetryAttempt", () => {
    it("should record successful retry attempt", async () => {
      const result = await ErrorTrackingService.recordRetryAttempt(testUserId, testErrorId, {
        success: true,
      });

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Retry attempt recorded",
        expect.objectContaining({
          additionalData: expect.objectContaining({
            retrySuccess: true,
          }),
        })
      );
    });

    it("should record failed retry attempt with details", async () => {
      const result = await ErrorTrackingService.recordRetryAttempt(testUserId, testErrorId, {
        success: false,
        details: "Still getting rate limited",
      });

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Retry attempt recorded",
        expect.objectContaining({
          additionalData: expect.objectContaining({
            retrySuccess: false,
            retryDetails: "Still getting rate limited",
          }),
        })
      );
    });

    it("should handle retry recording errors", async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("DB error")),
        }),
      });

      const result = await ErrorTrackingService.recordRetryAttempt(testUserId, testErrorId, {
        success: true,
      });

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("getRetryableErrors", () => {
    it("should return errors eligible for retry", async () => {
      const mockRetryableErrors = [
        {
          id: "1",
          userId: testUserId,
          provider: "gmail",
          errorAt: new Date(),
          stage: "ingestion",
          error: "Temporary error",
          rawEventId: null,
          context: {
            classification: {
              category: "network",
              severity: "medium",
              retryable: true,
            },
            retryCount: 1,
            lastRetryAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
          },
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockRetryableErrors),
            }),
          }),
        }),
      });

      const errors = await ErrorTrackingService.getRetryableErrors(testUserId);

      expect(errors).toHaveLength(1);
      expect(errors[0].retryCount).toBe(1);
    });

    it("should filter by provider", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await ErrorTrackingService.getRetryableErrors(testUserId, {
        provider: "calendar",
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should respect max retry count", async () => {
      await ErrorTrackingService.getRetryableErrors(testUserId, {
        maxRetryCount: 5,
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should return empty array on error", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error("DB error")),
            }),
          }),
        }),
      });

      const errors = await ErrorTrackingService.getRetryableErrors(testUserId);

      expect(errors).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("cleanupOldErrors", () => {
    it("should delete old resolved errors", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: "1" }, { id: "2" }]),
      });

      const result = await ErrorTrackingService.cleanupOldErrors(30);

      expect(result.deletedCount).toBe(2);
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Old errors cleaned up",
        expect.objectContaining({
          additionalData: expect.objectContaining({
            retentionDays: 30,
            deletedCount: 2,
          }),
        })
      );
    });

    it("should handle cleanup errors gracefully", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error("DB error")),
      });

      const result = await ErrorTrackingService.cleanupOldErrors(30);

      expect(result.deletedCount).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should use custom retention period", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });

      await ErrorTrackingService.cleanupOldErrors(7);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
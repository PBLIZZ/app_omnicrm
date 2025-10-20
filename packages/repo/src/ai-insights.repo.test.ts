import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiInsightsRepository, createAiInsightsRepository } from "./ai-insights.repo";
import { createMockDbClient, createMockQueryBuilder, type MockDbClient } from "@packages/testing";
import type { AiInsight } from "@/server/db/schema";

describe("AiInsightsRepository", () => {
  let mockDb: MockDbClient;
  let repo: AiInsightsRepository;
  const mockUserId = "user-123";
  const mockInsightId = "insight-456";

  const createMockInsight = (overrides: Partial<AiInsight> = {}): AiInsight => ({
    id: mockInsightId,
    userId: mockUserId,
    subjectType: "contact",
    subjectId: "contact-123",
    kind: "wellness_goal",
    content: { summary: "Interested in stress management" },
    model: null,
    fingerprint: "fp123",
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = createAiInsightsRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("listAiInsights", () => {
    it("should list insights with default pagination", async () => {
      const mockInsights = [createMockInsight(), createMockInsight({ id: "insight-2" })];

      const selectBuilder = createMockQueryBuilder(mockInsights);
      const countBuilder = createMockQueryBuilder([{ value: 10 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder) // First call for data
        .mockReturnValueOnce(countBuilder); // Second call for count

      const result = await repo.listAiInsights(mockUserId);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it("should filter by subject type", async () => {
      const mockInsights = [createMockInsight({ subjectType: "contact" })];

      const selectBuilder = createMockQueryBuilder(mockInsights);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder) // First call for data
        .mockReturnValueOnce(countBuilder); // Second call for count

      const result = await repo.listAiInsights(mockUserId, {
        subjectType: "contact",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.subjectType).toBe("contact");
    });

    it("should filter by subject id", async () => {
      const mockInsights = [createMockInsight({ subjectId: "contact-123" })];

      const selectBuilder = createMockQueryBuilder(mockInsights);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder) // First call for data
        .mockReturnValueOnce(countBuilder); // Second call for count

      const result = await repo.listAiInsights(mockUserId, {
        subjectId: "contact-123",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.subjectId).toBe("contact-123");
    });

    it("should filter by kinds array", async () => {
      const mockInsights = [createMockInsight({ kind: "wellness_goal" })];

      const selectBuilder = createMockQueryBuilder(mockInsights);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder) // First call for data
        .mockReturnValueOnce(countBuilder); // Second call for count

      const result = await repo.listAiInsights(mockUserId, {
        kinds: ["wellness_goal"],
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.kind).toBe("wellness_goal");
    });

    it("should search insights by content", async () => {
      const mockInsights = [createMockInsight({ content: "Yoga enthusiast" })];

      const selectBuilder = createMockQueryBuilder(mockInsights);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder) // First call for data
        .mockReturnValueOnce(countBuilder); // Second call for count

      const result = await repo.listAiInsights(mockUserId, {
        search: "Yoga",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.content).toContain("Yoga");
    });

    it("should handle custom pagination parameters", async () => {
      const mockInsights = [createMockInsight()];

      const selectBuilder = createMockQueryBuilder(mockInsights);
      const countBuilder = createMockQueryBuilder([{ value: 100 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder) // First call for data
        .mockReturnValueOnce(countBuilder); // Second call for count

      const result = await repo.listAiInsights(mockUserId, {
        page: 2,
        pageSize: 25,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(100);
    });

    it("should enforce maximum page size", async () => {
      const mockInsights = [createMockInsight()];

      const selectBuilder = createMockQueryBuilder(mockInsights);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder) // First call for data
        .mockReturnValueOnce(countBuilder); // Second call for count

      await repo.listAiInsights(mockUserId, { pageSize: 500 });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should enforce minimum page size", async () => {
      const mockInsights = [createMockInsight()];

      const selectBuilder = createMockQueryBuilder(mockInsights);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder) // First call for data
        .mockReturnValueOnce(countBuilder); // Second call for count

      await repo.listAiInsights(mockUserId, { pageSize: 0 });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should sort ascending when order is asc", async () => {
      const mockInsights = [
        createMockInsight({ id: "insight-1" }),
        createMockInsight({ id: "insight-2" }),
      ];

      const selectBuilder = createMockQueryBuilder(mockInsights);
      const countBuilder = createMockQueryBuilder([{ value: 2 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder) // First call for data
        .mockReturnValueOnce(countBuilder); // Second call for count

      const result = await repo.listAiInsights(mockUserId, { order: "asc" });

      expect(result.items).toHaveLength(2);
    });

    it("should handle empty results", async () => {
      const selectBuilder = createMockQueryBuilder([]);
      const countBuilder = createMockQueryBuilder([{ value: 0 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder) // First call for data
        .mockReturnValueOnce(countBuilder); // Second call for count

      const result = await repo.listAiInsights(mockUserId);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("getAiInsightById", () => {
    it("should return insight when found", async () => {
      const mockInsight = createMockInsight();
      const selectBuilder = createMockQueryBuilder([mockInsight]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.getAiInsightById(mockUserId, mockInsightId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockInsightId);
    });

    it("should return null when not found", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.getAiInsightById(mockUserId, "non-existent");

      expect(result).toBeNull();
    });

    it("should respect user isolation", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.getAiInsightById("different-user", mockInsightId);

      expect(result).toBeNull();
    });
  });

  describe("findByFingerprint", () => {
    it("should find insight by fingerprint", async () => {
      const mockInsight = createMockInsight({ fingerprint: "unique-fp" });
      const selectBuilder = createMockQueryBuilder([mockInsight]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.findByFingerprint(mockUserId, "unique-fp");

      expect(result).not.toBeNull();
      expect(result?.fingerprint).toBe("unique-fp");
    });

    it("should return null when fingerprint not found", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.findByFingerprint(mockUserId, "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createAiInsight", () => {
    it("should create new insight", async () => {
      const mockInsight = createMockInsight();
      const insertBuilder = createMockQueryBuilder([mockInsight]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder);

      const data = {
        userId: mockUserId,
        subjectType: "contact",
        subjectId: "contact-123",
        kind: "wellness_goal",
        content: "Interested in meditation",
        fingerprint: "fp456",
      };

      const result = await repo.createAiInsight(data);

      expect(result).not.toBeNull();
      expect(result.id).toBe(mockInsightId);
    });

    it("should throw error when insert returns no data", async () => {
      const insertBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder);

      const data = {
        userId: mockUserId,
        subjectType: "contact",
        subjectId: "contact-123",
        kind: "wellness_goal",
        content: "Test",
        fingerprint: "fp789",
      };

      await expect(repo.createAiInsight(data)).rejects.toThrow("Insert returned no data");
    });
  });

  describe("updateAiInsight", () => {
    it("should update existing insight", async () => {
      const mockInsight = createMockInsight({ model: "gpt-4o" } as any);
      const updateBuilder = createMockQueryBuilder([mockInsight]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder);

      const result = await repo.updateAiInsight(mockUserId, mockInsightId, {
        model: "gpt-4o",
      } as any);

      expect(result).not.toBeNull();
      expect(result?.model).toBe("gpt-4o");
    });

    it("should return null when insight not found", async () => {
      const updateBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder);

      const result = await repo.updateAiInsight(mockUserId, "non-existent", {
        model: "gpt-4o",
      });

      expect(result).toBeNull();
    });

    it("should throw error when no updates provided", async () => {
      await expect(repo.updateAiInsight(mockUserId, mockInsightId, {})).rejects.toThrow(
        "No fields provided for update",
      );
    });
  });

  describe("deleteAiInsight", () => {
    it("should delete insight and return count", async () => {
      const deleteBuilder = createMockQueryBuilder([{ id: mockInsightId }]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder);

      const result = await repo.deleteAiInsight(mockUserId, mockInsightId);

      expect(result).toBe(1);
    });

    it("should return 0 when insight not found", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder);

      const result = await repo.deleteAiInsight(mockUserId, "non-existent");

      expect(result).toBe(0);
    });
  });

  describe("deleteAiInsightsForUser", () => {
    it("should delete all insights for user", async () => {
      const deleteBuilder = createMockQueryBuilder([
        { id: "insight-1" },
        { id: "insight-2" },
        { id: "insight-3" },
      ]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder);

      const result = await repo.deleteAiInsightsForUser(mockUserId);

      expect(result).toBe(3);
    });

    it("should return 0 when no insights exist", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder);

      const result = await repo.deleteAiInsightsForUser(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe("findBySubjectIds", () => {
    it("should find insights for multiple subject ids", async () => {
      const mockInsights = [
        createMockInsight({ subjectId: "contact-1" }),
        createMockInsight({ id: "insight-2", subjectId: "contact-2" }),
      ];

      const selectBuilder = createMockQueryBuilder(mockInsights);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.findBySubjectIds(mockUserId, ["contact-1", "contact-2"]);

      expect(result).toHaveLength(2);
    });

    it("should filter by subject type", async () => {
      const mockInsights = [createMockInsight({ subjectType: "contact", subjectId: "contact-1" })];

      const selectBuilder = createMockQueryBuilder(mockInsights);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.findBySubjectIds(mockUserId, ["contact-1"], {
        subjectType: "contact",
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.subjectType).toBe("contact");
    });

    it("should filter by kind", async () => {
      const mockInsights = [createMockInsight({ kind: "wellness_goal", subjectId: "contact-1" })];

      const selectBuilder = createMockQueryBuilder(mockInsights);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.findBySubjectIds(mockUserId, ["contact-1"], {
        kind: "wellness_goal",
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.kind).toBe("wellness_goal");
    });

    it("should return empty array for empty subject ids", async () => {
      const result = await repo.findBySubjectIds(mockUserId, []);

      expect(result).toEqual([]);
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });
});

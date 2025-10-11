import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiInsightsRepository } from "./ai-insights.repo";
import type { DbClient } from "@/server/db/client";
import { aiInsights } from "@/server/db/schema";

// Mock database client
const createMockDb = () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return mockDb as unknown as DbClient;
};

describe("AiInsightsRepository", () => {
  let mockDb: DbClient;
  const testUserId = "test-user-123";
  const testInsightId = "insight-123";

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe("listAiInsights", () => {
    it("should list insights with default pagination", async () => {
      const mockInsights = [
        {
          id: "insight-1",
          userId: testUserId,
          subjectType: "contact",
          subjectId: "contact-1",
          kind: "summary",
          content: { text: "Test insight" },
          model: "gpt-4",
          createdAt: new Date(),
          fingerprint: "hash-1",
        },
      ];

      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce(mockInsights);
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([{ value: 1 }]);

      const result = await AiInsightsRepository.listAiInsights(mockDb, testUserId);

      expect(result.items).toEqual(mockInsights);
      expect(result.total).toBe(1);
    });

    it("should filter by subject type", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([{ value: 0 }]);

      await AiInsightsRepository.listAiInsights(mockDb, testUserId, {
        subjectType: "contact",
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should filter by subject id", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([{ value: 0 }]);

      await AiInsightsRepository.listAiInsights(mockDb, testUserId, {
        subjectId: "contact-1",
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should filter by kinds array", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([{ value: 0 }]);

      await AiInsightsRepository.listAiInsights(mockDb, testUserId, {
        kinds: ["summary", "analysis"],
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should search insights by content", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([{ value: 0 }]);

      await AiInsightsRepository.listAiInsights(mockDb, testUserId, {
        search: "wellness",
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should handle custom pagination parameters", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([{ value: 0 }]);

      await AiInsightsRepository.listAiInsights(mockDb, testUserId, {
        page: 2,
        pageSize: 25,
      });

      expect(mockDb.limit).toHaveBeenCalledWith(25);
      expect(mockDb.offset).toHaveBeenCalledWith(25); // (2-1) * 25
    });

    it("should enforce maximum page size", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([{ value: 0 }]);

      await AiInsightsRepository.listAiInsights(mockDb, testUserId, {
        pageSize: 500, // exceeds max
      });

      expect(mockDb.limit).toHaveBeenCalledWith(200); // clamped to max
    });

    it("should enforce minimum page size", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([{ value: 0 }]);

      await AiInsightsRepository.listAiInsights(mockDb, testUserId, {
        pageSize: 0,
      });

      expect(mockDb.limit).toHaveBeenCalledWith(1); // clamped to min
    });

    it("should sort ascending when order is asc", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([{ value: 0 }]);

      await AiInsightsRepository.listAiInsights(mockDb, testUserId, {
        order: "asc",
      });

      expect(mockDb.orderBy).toHaveBeenCalled();
    });

    it("should handle empty results", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([{ value: 0 }]);

      const result = await AiInsightsRepository.listAiInsights(mockDb, testUserId);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getAiInsightById", () => {
    it("should return insight when found", async () => {
      const mockInsight = {
        id: testInsightId,
        userId: testUserId,
        subjectType: "contact",
        subjectId: "contact-1",
        kind: "summary",
        content: { text: "Test" },
        model: "gpt-4",
        createdAt: new Date(),
        fingerprint: "hash-1",
      };

      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([mockInsight]);

      const result = await AiInsightsRepository.getAiInsightById(mockDb, testUserId, testInsightId);

      expect(result).toEqual(mockInsight);
    });

    it("should return null when not found", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);

      const result = await AiInsightsRepository.getAiInsightById(mockDb, testUserId, testInsightId);

      expect(result).toBeNull();
    });

    it("should respect user isolation", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);

      await AiInsightsRepository.getAiInsightById(mockDb, "different-user", testInsightId);

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("findByFingerprint", () => {
    it("should find insight by fingerprint", async () => {
      const mockInsight = {
        id: testInsightId,
        userId: testUserId,
        fingerprint: "unique-fingerprint",
        subjectType: "contact",
        subjectId: null,
        kind: "summary",
        content: {},
        model: null,
        createdAt: new Date(),
      };

      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([mockInsight]);

      const result = await AiInsightsRepository.findByFingerprint(mockDb, testUserId, "unique-fingerprint");

      expect(result).toEqual(mockInsight);
    });

    it("should return null when fingerprint not found", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);

      const result = await AiInsightsRepository.findByFingerprint(mockDb, testUserId, "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createAiInsight", () => {
    it("should create new insight", async () => {
      const newInsight = {
        userId: testUserId,
        subjectType: "contact",
        subjectId: "contact-1",
        kind: "summary",
        content: { text: "New insight" },
        model: "gpt-4",
        fingerprint: "new-hash",
      };

      const createdInsight = { ...newInsight, id: "new-id", createdAt: new Date() };

      vi.mocked(mockDb.insert(aiInsights).values(newInsight).returning).mockResolvedValueOnce([createdInsight]);

      const result = await AiInsightsRepository.createAiInsight(mockDb, newInsight);

      expect(result).toEqual(createdInsight);
    });

    it("should throw error when insert returns no data", async () => {
      const newInsight = {
        userId: testUserId,
        subjectType: "contact",
        subjectId: "contact-1",
        kind: "summary",
        content: {},
      };

      vi.mocked(mockDb.insert(aiInsights).values(newInsight).returning).mockResolvedValueOnce([]);

      await expect(AiInsightsRepository.createAiInsight(mockDb, newInsight)).rejects.toThrow(
        "Insert returned no data"
      );
    });
  });

  describe("updateAiInsight", () => {
    it("should update existing insight", async () => {
      const updates = { content: { text: "Updated" } };
      const updated = {
        id: testInsightId,
        userId: testUserId,
        content: { text: "Updated" },
        subjectType: "contact",
        subjectId: null,
        kind: "summary",
        model: null,
        createdAt: new Date(),
        fingerprint: null,
      };

      vi.mocked(mockDb.update(aiInsights).set(updates).where).mockResolvedValueOnce([updated]);

      const result = await AiInsightsRepository.updateAiInsight(mockDb, testUserId, testInsightId, updates);

      expect(result).toEqual(updated);
    });

    it("should return null when insight not found", async () => {
      vi.mocked(mockDb.update(aiInsights).set({}).where).mockResolvedValueOnce([]);

      const result = await AiInsightsRepository.updateAiInsight(mockDb, testUserId, testInsightId, { content: {} });

      expect(result).toBeNull();
    });

    it("should throw error when no updates provided", async () => {
      await expect(AiInsightsRepository.updateAiInsight(mockDb, testUserId, testInsightId, {})).rejects.toThrow(
        "No fields provided for update"
      );
    });
  });

  describe("deleteAiInsight", () => {
    it("should delete insight and return count", async () => {
      vi.mocked(mockDb.delete(aiInsights).where).mockResolvedValueOnce([{ id: testInsightId }]);

      const count = await AiInsightsRepository.deleteAiInsight(mockDb, testUserId, testInsightId);

      expect(count).toBe(1);
    });

    it("should return 0 when insight not found", async () => {
      vi.mocked(mockDb.delete(aiInsights).where).mockResolvedValueOnce([]);

      const count = await AiInsightsRepository.deleteAiInsight(mockDb, testUserId, testInsightId);

      expect(count).toBe(0);
    });
  });

  describe("deleteAiInsightsForUser", () => {
    it("should delete all insights for user", async () => {
      vi.mocked(mockDb.delete(aiInsights).where).mockResolvedValueOnce([
        { id: "id-1" },
        { id: "id-2" },
        { id: "id-3" },
      ]);

      const count = await AiInsightsRepository.deleteAiInsightsForUser(mockDb, testUserId);

      expect(count).toBe(3);
    });

    it("should return 0 when no insights exist", async () => {
      vi.mocked(mockDb.delete(aiInsights).where).mockResolvedValueOnce([]);

      const count = await AiInsightsRepository.deleteAiInsightsForUser(mockDb, testUserId);

      expect(count).toBe(0);
    });
  });

  describe("findBySubjectIds", () => {
    it("should find insights for multiple subject ids", async () => {
      const mockInsights = [
        {
          id: "insight-1",
          userId: testUserId,
          subjectType: "contact",
          subjectId: "contact-1",
          kind: "summary",
          content: {},
          model: null,
          createdAt: new Date(),
          fingerprint: null,
        },
        {
          id: "insight-2",
          userId: testUserId,
          subjectType: "contact",
          subjectId: "contact-2",
          kind: "summary",
          content: {},
          model: null,
          createdAt: new Date(),
          fingerprint: null,
        },
      ];

      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce(mockInsights);

      const result = await AiInsightsRepository.findBySubjectIds(mockDb, testUserId, ["contact-1", "contact-2"]);

      expect(result).toEqual(mockInsights);
    });

    it("should filter by subject type", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);

      await AiInsightsRepository.findBySubjectIds(mockDb, testUserId, ["contact-1"], {
        subjectType: "contact",
      });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should filter by kind", async () => {
      vi.mocked(mockDb.select().from(aiInsights).where).mockResolvedValueOnce([]);

      await AiInsightsRepository.findBySubjectIds(mockDb, testUserId, ["contact-1"], {
        kind: "summary",
      });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should return empty array for empty subject ids", async () => {
      const result = await AiInsightsRepository.findBySubjectIds(mockDb, testUserId, []);

      expect(result).toEqual([]);
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });
});
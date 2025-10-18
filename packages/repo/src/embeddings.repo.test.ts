import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbeddingsRepository, createEmbeddingsRepository } from "./embeddings.repo";
import { createMockDbClient, createMockQueryBuilder, type MockDbClient } from "@packages/testing";
import type { Embedding } from "@/server/db/schema";

describe("EmbeddingsRepository", () => {
  let mockDb: MockDbClient;
  let repo: EmbeddingsRepository;
  const mockUserId = "user-123";
  const mockEmbeddingId = "emb-456";

  const createMockEmbedding = (overrides: Partial<Embedding> = {}): Embedding => ({
    id: mockEmbeddingId,
    userId: mockUserId,
    ownerType: "document",
    ownerId: "doc-123",
    contentHash: "hash123",
    embedding: null,
    embeddingV: null,
    chunkIndex: 0,
    meta: { contentText: "Sample text", model: "text-embedding-ada-002" },
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = createEmbeddingsRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("listEmbeddings", () => {
    it("should list embeddings with default pagination", async () => {
      const mockEmbs = [createMockEmbedding(), createMockEmbedding({ id: "emb-2" })];

      const selectBuilder = createMockQueryBuilder(mockEmbs);
      const countBuilder = createMockQueryBuilder([{ value: 10 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listEmbeddings(mockUserId);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it("should filter by owner type", async () => {
      const mockEmbs = [createMockEmbedding({ ownerType: "document" })];

      const selectBuilder = createMockQueryBuilder(mockEmbs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listEmbeddings(mockUserId, {
        ownerType: ["document"],
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.ownerType).toBe("document");
    });

    it("should filter by owner id", async () => {
      const mockEmbs = [createMockEmbedding({ ownerId: "doc-123" })];

      const selectBuilder = createMockQueryBuilder(mockEmbs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listEmbeddings(mockUserId, {
        ownerId: "doc-123",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.ownerId).toBe("doc-123");
    });

    it("should filter embeddings that have embedding data", async () => {
      const mockEmbs = [createMockEmbedding({ embedding: "[1.0, 2.0, 3.0]" })];

      const selectBuilder = createMockQueryBuilder(mockEmbs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listEmbeddings(mockUserId, {
        hasEmbedding: true,
      });

      expect(result.items).toHaveLength(1);
    });

    it("should filter embeddings without embedding data", async () => {
      const mockEmbs = [createMockEmbedding({ embedding: null })];

      const selectBuilder = createMockQueryBuilder(mockEmbs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listEmbeddings(mockUserId, {
        hasEmbedding: false,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.embedding).toBeNull();
    });

    it("should filter by created after date", async () => {
      const mockEmbs = [createMockEmbedding()];

      const selectBuilder = createMockQueryBuilder(mockEmbs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listEmbeddings(mockUserId, {
        createdAfter: new Date("2024-01-01"),
      });

      expect(result.items).toHaveLength(1);
    });

    it("should filter by created before date", async () => {
      const mockEmbs = [createMockEmbedding()];

      const selectBuilder = createMockQueryBuilder(mockEmbs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listEmbeddings(mockUserId, {
        createdBefore: new Date("2024-12-31"),
      });

      expect(result.items).toHaveLength(1);
    });

    it("should handle custom pagination", async () => {
      const mockEmbs = [createMockEmbedding()];

      const selectBuilder = createMockQueryBuilder(mockEmbs);
      const countBuilder = createMockQueryBuilder([{ value: 100 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listEmbeddings(mockUserId, {
        page: 2,
        pageSize: 25,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(100);
    });

    it("should enforce maximum page size", async () => {
      const mockEmbs = [createMockEmbedding()];

      const selectBuilder = createMockQueryBuilder(mockEmbs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      await repo.listEmbeddings(mockUserId, { pageSize: 500 });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should sort ascending when specified", async () => {
      const mockEmbs = [createMockEmbedding({ id: "emb-1" }), createMockEmbedding({ id: "emb-2" })];

      const selectBuilder = createMockQueryBuilder(mockEmbs);
      const countBuilder = createMockQueryBuilder([{ value: 2 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listEmbeddings(mockUserId, { order: "asc" });

      expect(result.items).toHaveLength(2);
    });
  });

  describe("listEmbeddingsForOwner", () => {
    it("should list embeddings for specific owner", async () => {
      const mockEmbs = [
        createMockEmbedding({ chunkIndex: 0 }),
        createMockEmbedding({ id: "emb-2", chunkIndex: 1 }),
      ];

      const selectBuilder = createMockQueryBuilder(mockEmbs);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.listEmbeddingsForOwner(mockUserId, "document", "doc-123");

      expect(result).toHaveLength(2);
    });

    it("should order by chunk index", async () => {
      const mockEmbs = [
        createMockEmbedding({ chunkIndex: 0 }),
        createMockEmbedding({ id: "emb-2", chunkIndex: 1 }),
      ];

      const selectBuilder = createMockQueryBuilder(mockEmbs);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.listEmbeddingsForOwner(mockUserId, "document", "doc-123");

      expect(result).toHaveLength(2);
      expect(result[0]?.chunkIndex).toBe(0);
    });
  });

  describe("findByContentHash", () => {
    it("should find embedding by content hash", async () => {
      const mockEmb = createMockEmbedding({ contentHash: "hash123" });
      const selectBuilder = createMockQueryBuilder([mockEmb]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.findByContentHash(mockUserId, "hash123");

      expect(result).not.toBeNull();
      expect(result?.contentHash).toBe("hash123");
    });

    it("should return null when hash not found", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.findByContentHash(mockUserId, "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createEmbedding", () => {
    it("should create new embedding", async () => {
      const mockEmb = createMockEmbedding();
      const insertBuilder = createMockQueryBuilder([mockEmb]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const data = {
        userId: mockUserId,
        ownerType: "document",
        ownerId: "doc-123",
        contentHash: "hash123",
        embedding: null,
        embeddingV: null,
        chunkIndex: 0,
        meta: { contentText: "Sample text", model: "text-embedding-ada-002" },
      };

      const result = await repo.createEmbedding(data);

      expect(result).not.toBeNull();
      expect(result.id).toBe(mockEmbeddingId);
    });

    it("should throw error when insert returns no data", async () => {
      const insertBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const data = {
        userId: mockUserId,
        ownerType: "document",
        ownerId: "doc-123",
        contentHash: "hash123",
        embedding: null,
        embeddingV: null,
        chunkIndex: 0,
        meta: { contentText: "Sample text", model: "text-embedding-ada-002" },
      };

      await expect(repo.createEmbedding(data)).rejects.toThrow("Insert returned no data");
    });
  });

  describe("createEmbeddingsBulk", () => {
    it("should create multiple embeddings", async () => {
      const mockEmbs = [createMockEmbedding({ id: "emb-1" }), createMockEmbedding({ id: "emb-2" })];

      const insertBuilder = createMockQueryBuilder(mockEmbs);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const items = [
        {
          userId: mockUserId,
          ownerType: "document",
          ownerId: "doc-123",
          contentHash: "hash1",
          embedding: null,
          embeddingV: null,
          chunkIndex: 0,
          meta: { contentText: "Text 1", model: "text-embedding-ada-002" },
        },
        {
          userId: mockUserId,
          ownerType: "document",
          ownerId: "doc-123",
          contentHash: "hash2",
          embedding: null,
          embeddingV: null,
          chunkIndex: 1,
          meta: { contentText: "Text 2", model: "text-embedding-ada-002" },
        },
      ];

      const result = await repo.createEmbeddingsBulk(items);

      expect(result).toHaveLength(2);
    });

    it("should return empty array for empty input", async () => {
      const result = await repo.createEmbeddingsBulk([]);

      expect(result).toEqual([]);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe("updateEmbedding", () => {
    it("should update existing embedding", async () => {
      const mockEmb = createMockEmbedding({ embedding: "[1.0, 2.0]" });
      const updateBuilder = createMockQueryBuilder([mockEmb]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateEmbedding(mockUserId, mockEmbeddingId, {
        embedding: "[1.0, 2.0]",
      });

      expect(result).not.toBeNull();
      expect(result?.embedding).toBe("[1.0, 2.0]");
    });

    it("should return null when not found", async () => {
      const updateBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateEmbedding(mockUserId, "non-existent", {
        embedding: "[1.0, 2.0]",
      });

      expect(result).toBeNull();
    });

    it("should throw error when no updates provided", async () => {
      await expect(repo.updateEmbedding(mockUserId, mockEmbeddingId, {})).rejects.toThrow(
        "No fields provided for update",
      );
    });
  });

  describe("deleteEmbeddingsForOwner", () => {
    it("should delete all embeddings for owner", async () => {
      const deleteBuilder = createMockQueryBuilder([{ id: "emb-1" }, { id: "emb-2" }]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteEmbeddingsForOwner(mockUserId, "document", "doc-123");

      expect(result).toBe(2);
    });

    it("should return 0 when no embeddings exist", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteEmbeddingsForOwner(mockUserId, "document", "doc-123");

      expect(result).toBe(0);
    });
  });

  describe("deleteEmbeddingsForUser", () => {
    it("should delete all embeddings for user", async () => {
      const deleteBuilder = createMockQueryBuilder([
        { id: "emb-1" },
        { id: "emb-2" },
        { id: "emb-3" },
      ]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteEmbeddingsForUser(mockUserId);

      expect(result).toBe(3);
    });

    it("should return 0 when no embeddings exist", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteEmbeddingsForUser(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe("deleteEmbeddingById", () => {
    it("should delete single embedding", async () => {
      const deleteBuilder = createMockQueryBuilder([{ id: mockEmbeddingId }]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteEmbeddingById(mockUserId, mockEmbeddingId);

      expect(result).toBe(1);
    });

    it("should return 0 when not found", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteEmbeddingById(mockUserId, "non-existent");

      expect(result).toBe(0);
    });
  });
});

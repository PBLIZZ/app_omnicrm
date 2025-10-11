import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbeddingsRepository } from "./embeddings.repo";
import type { DbClient } from "@/server/db/client";
import { embeddings } from "@/server/db/schema";

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

describe("EmbeddingsRepository", () => {
  let mockDb: DbClient;
  const testUserId = "test-user-123";
  const testEmbeddingId = "embedding-123";
  const testOwnerId = "owner-123";

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe("listEmbeddings", () => {
    it("should list embeddings with default pagination", async () => {
      const mockEmbeddings = [
        {
          id: testEmbeddingId,
          userId: testUserId,
          ownerType: "document",
          ownerId: testOwnerId,
          embedding: "[0.1, 0.2, 0.3]",
          embeddingV: null,
          contentHash: "hash-123",
          chunkIndex: 0,
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce(mockEmbeddings);
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([{ value: 1 }]);

      const result = await EmbeddingsRepository.listEmbeddings(mockDb, testUserId);

      expect(result.items).toEqual(mockEmbeddings);
      expect(result.total).toBe(1);
    });

    it("should filter by owner type", async () => {
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([{ value: 0 }]);

      await EmbeddingsRepository.listEmbeddings(mockDb, testUserId, {
        ownerType: ["document"],
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should filter by owner id", async () => {
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([{ value: 0 }]);

      await EmbeddingsRepository.listEmbeddings(mockDb, testUserId, {
        ownerId: testOwnerId,
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should filter embeddings that have embedding data", async () => {
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([{ value: 0 }]);

      await EmbeddingsRepository.listEmbeddings(mockDb, testUserId, {
        hasEmbedding: true,
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should filter embeddings without embedding data", async () => {
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([{ value: 0 }]);

      await EmbeddingsRepository.listEmbeddings(mockDb, testUserId, {
        hasEmbedding: false,
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should filter by created after date", async () => {
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([{ value: 0 }]);

      const afterDate = new Date("2024-01-01");
      await EmbeddingsRepository.listEmbeddings(mockDb, testUserId, {
        createdAfter: afterDate,
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should filter by created before date", async () => {
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([{ value: 0 }]);

      const beforeDate = new Date("2024-12-31");
      await EmbeddingsRepository.listEmbeddings(mockDb, testUserId, {
        createdBefore: beforeDate,
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should handle custom pagination", async () => {
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([{ value: 0 }]);

      await EmbeddingsRepository.listEmbeddings(mockDb, testUserId, {
        page: 2,
        pageSize: 100,
      });

      expect(mockDb.limit).toHaveBeenCalledWith(100);
      expect(mockDb.offset).toHaveBeenCalledWith(100);
    });

    it("should enforce maximum page size", async () => {
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([{ value: 0 }]);

      await EmbeddingsRepository.listEmbeddings(mockDb, testUserId, {
        pageSize: 1000,
      });

      expect(mockDb.limit).toHaveBeenCalledWith(200);
    });

    it("should sort ascending when specified", async () => {
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([{ value: 0 }]);

      await EmbeddingsRepository.listEmbeddings(mockDb, testUserId, {
        order: "asc",
      });

      expect(mockDb.orderBy).toHaveBeenCalled();
    });
  });

  describe("listEmbeddingsForOwner", () => {
    it("should list embeddings for specific owner", async () => {
      const mockEmbeddings = [
        {
          id: "emb-1",
          userId: testUserId,
          ownerType: "document",
          ownerId: testOwnerId,
          embedding: "[0.1]",
          embeddingV: null,
          contentHash: "hash-1",
          chunkIndex: 0,
          createdAt: new Date(),
        },
        {
          id: "emb-2",
          userId: testUserId,
          ownerType: "document",
          ownerId: testOwnerId,
          embedding: "[0.2]",
          embeddingV: null,
          contentHash: "hash-2",
          chunkIndex: 1,
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce(mockEmbeddings);

      const result = await EmbeddingsRepository.listEmbeddingsForOwner(mockDb, testUserId, "document", testOwnerId);

      expect(result).toEqual(mockEmbeddings);
    });

    it("should order by chunk index", async () => {
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([]);

      await EmbeddingsRepository.listEmbeddingsForOwner(mockDb, testUserId, "document", testOwnerId);

      expect(mockDb.orderBy).toHaveBeenCalled();
    });
  });

  describe("findByContentHash", () => {
    it("should find embedding by content hash", async () => {
      const mockEmbedding = {
        id: testEmbeddingId,
        userId: testUserId,
        ownerType: "document",
        ownerId: testOwnerId,
        embedding: "[0.1]",
        embeddingV: null,
        contentHash: "unique-hash",
        chunkIndex: null,
        createdAt: new Date(),
      };

      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([mockEmbedding]);

      const result = await EmbeddingsRepository.findByContentHash(mockDb, testUserId, "unique-hash");

      expect(result).toEqual(mockEmbedding);
    });

    it("should return null when hash not found", async () => {
      vi.mocked(mockDb.select().from(embeddings).where).mockResolvedValueOnce([]);

      const result = await EmbeddingsRepository.findByContentHash(mockDb, testUserId, "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createEmbedding", () => {
    it("should create new embedding", async () => {
      const newEmbedding = {
        userId: testUserId,
        ownerType: "document",
        ownerId: testOwnerId,
        embedding: "[0.1, 0.2, 0.3]",
        contentHash: "new-hash",
        chunkIndex: 0,
      };

      const created = { ...newEmbedding, id: "new-id", embeddingV: null, createdAt: new Date() };

      vi.mocked(mockDb.insert(embeddings).values(newEmbedding).returning).mockResolvedValueOnce([created]);

      const result = await EmbeddingsRepository.createEmbedding(mockDb, newEmbedding);

      expect(result).toEqual(created);
    });

    it("should throw error when insert returns no data", async () => {
      const newEmbedding = {
        userId: testUserId,
        ownerType: "document",
        ownerId: testOwnerId,
      };

      vi.mocked(mockDb.insert(embeddings).values(newEmbedding).returning).mockResolvedValueOnce([]);

      await expect(EmbeddingsRepository.createEmbedding(mockDb, newEmbedding)).rejects.toThrow(
        "Insert returned no data"
      );
    });
  });

  describe("createEmbeddingsBulk", () => {
    it("should create multiple embeddings", async () => {
      const newEmbeddings = [
        {
          userId: testUserId,
          ownerType: "document",
          ownerId: testOwnerId,
          embedding: "[0.1]",
          contentHash: "hash-1",
          chunkIndex: 0,
        },
        {
          userId: testUserId,
          ownerType: "document",
          ownerId: testOwnerId,
          embedding: "[0.2]",
          contentHash: "hash-2",
          chunkIndex: 1,
        },
      ];

      const created = newEmbeddings.map((e, idx) => ({
        ...e,
        id: `id-${idx}`,
        embeddingV: null,
        createdAt: new Date(),
      }));

      vi.mocked(mockDb.insert(embeddings).values(newEmbeddings).returning).mockResolvedValueOnce(created);

      const result = await EmbeddingsRepository.createEmbeddingsBulk(mockDb, newEmbeddings);

      expect(result).toHaveLength(2);
      expect(result).toEqual(created);
    });

    it("should return empty array for empty input", async () => {
      const result = await EmbeddingsRepository.createEmbeddingsBulk(mockDb, []);

      expect(result).toEqual([]);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe("updateEmbedding", () => {
    it("should update existing embedding", async () => {
      const updates = { embedding: "[0.5, 0.6]" };
      const updated = {
        id: testEmbeddingId,
        userId: testUserId,
        ownerType: "document",
        ownerId: testOwnerId,
        embedding: "[0.5, 0.6]",
        embeddingV: null,
        contentHash: "hash",
        chunkIndex: 0,
        createdAt: new Date(),
      };

      vi.mocked(mockDb.update(embeddings).set(updates).where).mockResolvedValueOnce([updated]);

      const result = await EmbeddingsRepository.updateEmbedding(mockDb, testUserId, testEmbeddingId, updates);

      expect(result).toEqual(updated);
    });

    it("should return null when not found", async () => {
      vi.mocked(mockDb.update(embeddings).set({}).where).mockResolvedValueOnce([]);

      const result = await EmbeddingsRepository.updateEmbedding(mockDb, testUserId, testEmbeddingId, {
        embedding: "[0.1]",
      });

      expect(result).toBeNull();
    });

    it("should throw error when no updates provided", async () => {
      await expect(EmbeddingsRepository.updateEmbedding(mockDb, testUserId, testEmbeddingId, {})).rejects.toThrow(
        "No fields provided for update"
      );
    });
  });

  describe("deleteEmbeddingsForOwner", () => {
    it("should delete all embeddings for owner", async () => {
      vi.mocked(mockDb.delete(embeddings).where).mockResolvedValueOnce([
        { id: "emb-1" },
        { id: "emb-2" },
        { id: "emb-3" },
      ]);

      const count = await EmbeddingsRepository.deleteEmbeddingsForOwner(mockDb, testUserId, "document", testOwnerId);

      expect(count).toBe(3);
    });

    it("should return 0 when no embeddings exist", async () => {
      vi.mocked(mockDb.delete(embeddings).where).mockResolvedValueOnce([]);

      const count = await EmbeddingsRepository.deleteEmbeddingsForOwner(mockDb, testUserId, "document", testOwnerId);

      expect(count).toBe(0);
    });
  });

  describe("deleteEmbeddingsForUser", () => {
    it("should delete all embeddings for user", async () => {
      vi.mocked(mockDb.delete(embeddings).where).mockResolvedValueOnce([
        { id: "emb-1" },
        { id: "emb-2" },
        { id: "emb-3" },
        { id: "emb-4" },
      ]);

      const count = await EmbeddingsRepository.deleteEmbeddingsForUser(mockDb, testUserId);

      expect(count).toBe(4);
    });

    it("should return 0 when no embeddings exist", async () => {
      vi.mocked(mockDb.delete(embeddings).where).mockResolvedValueOnce([]);

      const count = await EmbeddingsRepository.deleteEmbeddingsForUser(mockDb, testUserId);

      expect(count).toBe(0);
    });
  });

  describe("deleteEmbeddingById", () => {
    it("should delete single embedding", async () => {
      vi.mocked(mockDb.delete(embeddings).where).mockResolvedValueOnce([{ id: testEmbeddingId }]);

      const count = await EmbeddingsRepository.deleteEmbeddingById(mockDb, testUserId, testEmbeddingId);

      expect(count).toBe(1);
    });

    it("should return 0 when not found", async () => {
      vi.mocked(mockDb.delete(embeddings).where).mockResolvedValueOnce([]);

      const count = await EmbeddingsRepository.deleteEmbeddingById(mockDb, testUserId, testEmbeddingId);

      expect(count).toBe(0);
    });
  });
});
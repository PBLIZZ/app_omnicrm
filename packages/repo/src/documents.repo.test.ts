import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentsRepository } from "./documents.repo";
import type { DbClient } from "@/server/db/client";
import { documents } from "@/server/db/schema";

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

describe("DocumentsRepository", () => {
  let mockDb: DbClient;
  const testUserId = "test-user-123";
  const testDocumentId = "doc-123";
  const testContactId = "contact-123";

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe("listDocuments", () => {
    it("should list documents with default pagination", async () => {
      const mockDocs = [
        {
          id: testDocumentId,
          userId: testUserId,
          ownerContactId: testContactId,
          sourceId: "source-1",
          provider: "drive",
          mime: "application/pdf",
          title: "Test Document",
          text: "Document content",
          size: 1024,
          url: "https://example.com/doc.pdf",
          meta: {},
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce(mockDocs);
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([{ value: 1 }]);

      const result = await DocumentsRepository.listDocuments(mockDb, testUserId);

      expect(result.items).toEqual(mockDocs);
      expect(result.total).toBe(1);
    });

    it("should filter by owner contact id", async () => {
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([{ value: 0 }]);

      await DocumentsRepository.listDocuments(mockDb, testUserId, {
        ownerContactId: testContactId,
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should filter by mime types", async () => {
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([{ value: 0 }]);

      await DocumentsRepository.listDocuments(mockDb, testUserId, {
        mimeTypes: ["application/pdf", "text/plain"],
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should search by title and text", async () => {
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([{ value: 0 }]);

      await DocumentsRepository.listDocuments(mockDb, testUserId, {
        search: "test query",
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should include unassigned documents when flag is set", async () => {
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([{ value: 0 }]);

      await DocumentsRepository.listDocuments(mockDb, testUserId, {
        includeUnassigned: true,
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should exclude unassigned by default", async () => {
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([{ value: 0 }]);

      await DocumentsRepository.listDocuments(mockDb, testUserId);

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should handle custom pagination", async () => {
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([{ value: 0 }]);

      await DocumentsRepository.listDocuments(mockDb, testUserId, {
        page: 2,
        pageSize: 30,
      });

      expect(mockDb.limit).toHaveBeenCalledWith(30);
      expect(mockDb.offset).toHaveBeenCalledWith(30);
    });

    it("should enforce maximum page size", async () => {
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([{ value: 0 }]);

      await DocumentsRepository.listDocuments(mockDb, testUserId, {
        pageSize: 500,
      });

      expect(mockDb.limit).toHaveBeenCalledWith(200);
    });

    it("should sort ascending when specified", async () => {
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([]);
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([{ value: 0 }]);

      await DocumentsRepository.listDocuments(mockDb, testUserId, {
        order: "asc",
      });

      expect(mockDb.orderBy).toHaveBeenCalled();
    });
  });

  describe("getDocumentById", () => {
    it("should return document when found", async () => {
      const mockDoc = {
        id: testDocumentId,
        userId: testUserId,
        ownerContactId: testContactId,
        sourceId: "source-1",
        provider: "drive",
        mime: "application/pdf",
        title: "Test",
        text: "Content",
        size: 1024,
        url: "https://example.com/doc.pdf",
        meta: {},
        createdAt: new Date(),
      };

      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([mockDoc]);

      const result = await DocumentsRepository.getDocumentById(mockDb, testUserId, testDocumentId);

      expect(result).toEqual(mockDoc);
    });

    it("should return null when not found", async () => {
      vi.mocked(mockDb.select().from(documents).where).mockResolvedValueOnce([]);

      const result = await DocumentsRepository.getDocumentById(mockDb, testUserId, testDocumentId);

      expect(result).toBeNull();
    });
  });

  describe("createDocument", () => {
    it("should create new document", async () => {
      const newDoc = {
        userId: testUserId,
        ownerContactId: testContactId,
        sourceId: "source-1",
        provider: "drive",
        mime: "application/pdf",
        title: "New Doc",
        text: "Content",
        size: 2048,
        url: "https://example.com/new.pdf",
      };

      const created = { ...newDoc, id: "new-id", meta: null, createdAt: new Date() };

      vi.mocked(mockDb.insert(documents).values(newDoc).returning).mockResolvedValueOnce([created]);

      const result = await DocumentsRepository.createDocument(mockDb, newDoc);

      expect(result).toEqual(created);
    });

    it("should throw error when insert returns no data", async () => {
      const newDoc = {
        userId: testUserId,
        sourceId: "source-1",
        provider: "drive",
        mime: "application/pdf",
        title: "Test",
      };

      vi.mocked(mockDb.insert(documents).values(newDoc).returning).mockResolvedValueOnce([]);

      await expect(DocumentsRepository.createDocument(mockDb, newDoc)).rejects.toThrow("Insert returned no data");
    });
  });

  describe("updateDocument", () => {
    it("should update existing document", async () => {
      const updates = { title: "Updated Title" };
      const updated = {
        id: testDocumentId,
        userId: testUserId,
        ownerContactId: testContactId,
        sourceId: "source-1",
        provider: "drive",
        mime: "application/pdf",
        title: "Updated Title",
        text: "Content",
        size: 1024,
        url: "https://example.com/doc.pdf",
        meta: null,
        createdAt: new Date(),
      };

      vi.mocked(mockDb.update(documents).set(updates).where).mockResolvedValueOnce([updated]);

      const result = await DocumentsRepository.updateDocument(mockDb, testUserId, testDocumentId, updates);

      expect(result).toEqual(updated);
    });

    it("should return null when not found", async () => {
      vi.mocked(mockDb.update(documents).set({}).where).mockResolvedValueOnce([]);

      const result = await DocumentsRepository.updateDocument(mockDb, testUserId, testDocumentId, { title: "Test" });

      expect(result).toBeNull();
    });

    it("should throw error when no updates provided", async () => {
      await expect(DocumentsRepository.updateDocument(mockDb, testUserId, testDocumentId, {})).rejects.toThrow(
        "No fields provided for update"
      );
    });
  });

  describe("deleteDocument", () => {
    it("should delete document and return count", async () => {
      vi.mocked(mockDb.delete(documents).where).mockResolvedValueOnce([{ id: testDocumentId }]);

      const count = await DocumentsRepository.deleteDocument(mockDb, testUserId, testDocumentId);

      expect(count).toBe(1);
    });

    it("should return 0 when not found", async () => {
      vi.mocked(mockDb.delete(documents).where).mockResolvedValueOnce([]);

      const count = await DocumentsRepository.deleteDocument(mockDb, testUserId, testDocumentId);

      expect(count).toBe(0);
    });
  });

  describe("deleteDocumentsForUser", () => {
    it("should delete all documents for user", async () => {
      vi.mocked(mockDb.delete(documents).where).mockResolvedValueOnce([
        { id: "doc-1" },
        { id: "doc-2" },
        { id: "doc-3" },
      ]);

      const count = await DocumentsRepository.deleteDocumentsForUser(mockDb, testUserId);

      expect(count).toBe(3);
    });

    it("should return 0 when no documents exist", async () => {
      vi.mocked(mockDb.delete(documents).where).mockResolvedValueOnce([]);

      const count = await DocumentsRepository.deleteDocumentsForUser(mockDb, testUserId);

      expect(count).toBe(0);
    });
  });
});
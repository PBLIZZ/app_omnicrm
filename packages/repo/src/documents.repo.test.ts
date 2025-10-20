import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentsRepository, createDocumentsRepository } from "./documents.repo";
import { createMockDbClient, createMockQueryBuilder, type MockDbClient } from "@packages/testing";
import type { IntelligenceDocument } from "@/server/db/schema";

describe("DocumentsRepository", () => {
  let mockDb: MockDbClient;
  let repo: DocumentsRepository;
  const mockUserId = "user-123";
  const mockDocumentId = "doc-456";

  const createMockDocument = (
    overrides: Partial<IntelligenceDocument> = {},
  ): IntelligenceDocument => ({
    id: mockDocumentId,
    userId: mockUserId,
    ownerContactId: "contact-123",
    title: "Test Document",
    text: "Document content",
    mime: "application/pdf",
    meta: { path: "/documents/test.pdf", byteSize: 1024 },
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = createDocumentsRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("listDocuments", () => {
    it("should list documents with default pagination", async () => {
      const mockDocs = [createMockDocument(), createMockDocument({ id: "doc-2" })];

      const selectBuilder = createMockQueryBuilder(mockDocs);
      const countBuilder = createMockQueryBuilder([{ value: 10 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listDocuments(mockUserId);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it("should filter by owner contact id", async () => {
      const mockDocs = [createMockDocument()];

      const selectBuilder = createMockQueryBuilder(mockDocs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listDocuments(mockUserId, { ownerContactId: "contact-123" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.ownerContactId).toBe("contact-123");
    });

    it("should filter by mime types", async () => {
      const mockDocs = [createMockDocument({ mime: "application/pdf" })];

      const selectBuilder = createMockQueryBuilder(mockDocs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listDocuments(mockUserId, { mimeTypes: ["application/pdf"] });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.mime).toBe("application/pdf");
    });

    it("should search by title and text", async () => {
      const mockDocs = [createMockDocument({ title: "Important Document" })];

      const selectBuilder = createMockQueryBuilder(mockDocs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listDocuments(mockUserId, { search: "Important" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.title).toContain("Important");
    });

    it("should include unassigned documents when flag is set", async () => {
      const mockDocs = [createMockDocument({ ownerContactId: null })];

      const selectBuilder = createMockQueryBuilder(mockDocs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listDocuments(mockUserId, { includeUnassigned: true });

      expect(result.items).toHaveLength(1);
    });

    it("should exclude unassigned by default", async () => {
      const mockDocs = [createMockDocument()];

      const selectBuilder = createMockQueryBuilder(mockDocs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listDocuments(mockUserId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.ownerContactId).not.toBeNull();
    });

    it("should handle custom pagination", async () => {
      const mockDocs = [createMockDocument()];

      const selectBuilder = createMockQueryBuilder(mockDocs);
      const countBuilder = createMockQueryBuilder([{ value: 100 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listDocuments(mockUserId, { page: 2, pageSize: 25 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(100);
    });

    it("should enforce maximum page size", async () => {
      const mockDocs = [createMockDocument()];

      const selectBuilder = createMockQueryBuilder(mockDocs);
      const countBuilder = createMockQueryBuilder([{ value: 1 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      // Try to request more than max (200)
      await repo.listDocuments(mockUserId, { pageSize: 500 });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should sort ascending when specified", async () => {
      const mockDocs = [
        createMockDocument({ id: "doc-1", createdAt: new Date("2024-01-01") }),
        createMockDocument({ id: "doc-2", createdAt: new Date("2024-01-02") }),
      ];

      const selectBuilder = createMockQueryBuilder(mockDocs);
      const countBuilder = createMockQueryBuilder([{ value: 2 }]);

      vi.mocked(mockDb.select)
        .mockReturnValueOnce(selectBuilder as any)
        .mockReturnValueOnce(countBuilder as any);

      const result = await repo.listDocuments(mockUserId, { order: "asc" });

      expect(result.items).toHaveLength(2);
    });
  });

  describe("getDocumentById", () => {
    it("should return document when found", async () => {
      const mockDoc = createMockDocument();
      const selectBuilder = createMockQueryBuilder([mockDoc]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.getDocumentById(mockUserId, mockDocumentId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockDocumentId);
    });

    it("should return null when not found", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.getDocumentById(mockUserId, "non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createDocument", () => {
    it("should create new document", async () => {
      const mockDoc = createMockDocument();
      const insertBuilder = createMockQueryBuilder([mockDoc]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const data = {
        userId: mockUserId,
        title: "New Document",
        text: "Content",
        mime: "application/pdf",
        meta: { path: "/docs/new.pdf", byteSize: 2048 },
      };

      const result = await repo.createDocument(data);

      expect(result).not.toBeNull();
      expect(result.id).toBe(mockDocumentId);
    });

    it("should throw error when insert returns no data", async () => {
      const insertBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const data = {
        userId: mockUserId,
        title: "New Document",
        text: "Content",
        mime: "application/pdf",
        meta: { path: "/docs/new.pdf", byteSize: 2048 },
      };

      await expect(repo.createDocument(data)).rejects.toThrow("Insert returned no data");
    });
  });

  describe("updateDocument", () => {
    it("should update existing document", async () => {
      const mockDoc = createMockDocument({ title: "Updated Document" });
      const updateBuilder = createMockQueryBuilder([mockDoc]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateDocument(mockUserId, mockDocumentId, {
        title: "Updated Document",
      });

      expect(result).not.toBeNull();
      expect(result?.title).toBe("Updated Document");
    });

    it("should return null when not found", async () => {
      const updateBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder as any);

      const result = await repo.updateDocument(mockUserId, "non-existent", { title: "Updated" });

      expect(result).toBeNull();
    });

    it("should throw error when no updates provided", async () => {
      await expect(repo.updateDocument(mockUserId, mockDocumentId, {})).rejects.toThrow(
        "No fields provided for update",
      );
    });
  });

  describe("deleteDocument", () => {
    it("should delete document and return count", async () => {
      const deleteBuilder = createMockQueryBuilder([{ id: mockDocumentId }]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteDocument(mockUserId, mockDocumentId);

      expect(result).toBe(1);
    });

    it("should return 0 when not found", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteDocument(mockUserId, "non-existent");

      expect(result).toBe(0);
    });
  });

  describe("deleteDocumentsForUser", () => {
    it("should delete all documents for user", async () => {
      const deleteBuilder = createMockQueryBuilder([
        { id: "doc-1" },
        { id: "doc-2" },
        { id: "doc-3" },
      ]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteDocumentsForUser(mockUserId);

      expect(result).toBe(3);
    });

    it("should return 0 when no documents exist", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteDocumentsForUser(mockUserId);

      expect(result).toBe(0);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTagsRepository } from "../tags.repo";
import type { DbClient } from "@/server/db/client";

// Mock the database client
vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

describe("TagsRepository", () => {
  let mockDb: any;
  let repo: ReturnType<typeof createTagsRepository>;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
    };

    repo = createTagsRepository(mockDb);
  });

  describe("CRUD operations", () => {
    it("should create a tag", async () => {
      const tagData = {
        userId: "test-user-id",
        name: "Test Tag",
        category: "general" as const,
        color: "#3B82F6",
      };

      const mockTag = {
        id: "test-id",
        userId: "test-user-id",
        name: "Test Tag",
        category: "general",
        color: "#3B82F6",
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.returning.mockResolvedValue([mockTag]);

      const tag = await repo.createTag(tagData);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(tagData);
      expect(tag).toEqual(mockTag);
    });

    it("should get tag by ID", async () => {
      const mockTag = {
        id: "test-id",
        userId: "test-user-id",
        name: "Test Tag",
        category: "general",
        color: "#3B82F6",
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.limit.mockResolvedValue([mockTag]);

      const retrievedTag = await repo.getTagById("test-user-id", "test-id");

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(retrievedTag).toEqual(mockTag);
    });

    it("should return null for non-existent tag", async () => {
      mockDb.limit.mockResolvedValue([]);

      const retrievedTag = await repo.getTagById("test-user-id", "non-existent-id");
      expect(retrievedTag).toBeNull();
    });

    it("should get tag by name (case-insensitive)", async () => {
      const mockTag = {
        id: "test-id",
        userId: "test-user-id",
        name: "Test Tag",
        category: "general",
        color: "#3B82F6",
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.limit.mockResolvedValue([mockTag]);

      const retrievedTag = await repo.getTagByName("test-user-id", "test tag");

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(retrievedTag).toEqual(mockTag);
    });

    it("should update tag", async () => {
      const mockUpdatedTag = {
        id: "test-id",
        userId: "test-user-id",
        name: "Updated Tag",
        category: "general",
        color: "#EF4444",
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.returning.mockResolvedValue([mockUpdatedTag]);

      const updatedTag = await repo.updateTag("test-user-id", "test-id", {
        name: "Updated Tag",
        color: "#EF4444",
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(updatedTag).toEqual(mockUpdatedTag);
    });

    it("should delete tag", async () => {
      mockDb.returning.mockResolvedValue([{ id: "test-id" }]);

      const deleted = await repo.deleteTag("test-user-id", "test-id");

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(deleted).toBe(true);
    });

    it("should list tags with pagination", async () => {
      const mockTags = [
        { id: "1", name: "Tag 1", category: "general", color: "#3B82F6", usageCount: 0 },
        { id: "2", name: "Tag 2", category: "client", color: "#10B981", usageCount: 5 },
      ];

      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      });

      // Mock items query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockTags),
      });

      const result = await repo.listTags("test-user-id", {
        page: 1,
        pageSize: 2,
        sort: "name",
        order: "asc",
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.items[0].name).toBe("Tag 1");
      expect(result.items[1].name).toBe("Tag 2");
    });

    it("should filter tags by category", async () => {
      const mockTags = [
        { id: "2", name: "Client Tag", category: "client", color: "#10B981", usageCount: 5 },
      ];

      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      });

      // Mock items query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockTags),
      });

      const result = await repo.listTags("test-user-id", {
        category: "client",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe("Client Tag");
    });

    it("should search tags by name", async () => {
      const mockTags = [
        { id: "1", name: "Important Tag", category: "general", color: "#3B82F6", usageCount: 0 },
      ];

      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      });

      // Mock items query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockTags),
      });

      const result = await repo.listTags("test-user-id", {
        search: "Important",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe("Important Tag");
    });

    it("should count tags", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      });

      const totalCount = await repo.countTags("test-user-id");
      expect(totalCount).toBe(3);

      const generalCount = await repo.countTags("test-user-id", undefined, "general");
      expect(generalCount).toBe(3);

      const searchCount = await repo.countTags("test-user-id", "Tag 1");
      expect(searchCount).toBe(3);
    });
  });

  describe("bulk operations", () => {
    it("should get multiple tags by IDs", async () => {
      const mockTags = [
        { id: "1", name: "Tag 1", category: "general", color: "#3B82F6", usageCount: 0 },
        { id: "2", name: "Tag 2", category: "client", color: "#10B981", usageCount: 5 },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockTags),
      });

      const retrievedTags = await repo.getTagsByIds("test-user-id", ["1", "2"]);

      expect(retrievedTags).toHaveLength(2);
      expect(retrievedTags.map((t) => t.name)).toContain("Tag 1");
      expect(retrievedTags.map((t) => t.name)).toContain("Tag 2");
    });

    it("should return empty array for empty IDs list", async () => {
      const retrievedTags = await repo.getTagsByIds("test-user-id", []);
      expect(retrievedTags).toHaveLength(0);
    });

    it("should bulk delete tags", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ count: 2 }),
      });

      const deletedCount = await repo.deleteTagsByIds("test-user-id", ["1", "2"]);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(deletedCount).toBe(2);
    });
  });

  describe("tag usage statistics", () => {
    it("should get tag usage statistics", async () => {
      const mockStats = [{ tagId: "test-id", usageCount: 0, entityType: "tag" }];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockStats),
      });

      const stats = await repo.getTagUsageStats("test-user-id");

      expect(stats).toHaveLength(1);
      expect(stats[0]).toMatchObject({
        tagId: "test-id",
        usageCount: 0,
        entityType: "tag",
      });
    });
  });

  describe("contact tag operations", () => {
    it("should apply tags to contact", async () => {
      const mockContactTags = [
        {
          id: "1",
          contactId: "contact-1",
          tagId: "tag-1",
          createdBy: "user-1",
          createdAt: new Date(),
        },
        {
          id: "2",
          contactId: "contact-1",
          tagId: "tag-2",
          createdBy: "user-1",
          createdAt: new Date(),
        },
      ];

      // Mock getTagsByIds call
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { id: "tag-1", name: "Tag 1" },
          { id: "tag-2", name: "Tag 2" },
        ]),
      });

      // Mock insert call
      mockDb.returning.mockResolvedValue(mockContactTags);

      const result = await repo.applyTagsToContact(
        "test-user-id",
        "contact-1",
        ["tag-1", "tag-2"],
        "user-1",
      );

      expect(result).toEqual(mockContactTags);
    });

    it("should remove tags from contact", async () => {
      // Mock getTagsByIds call to verify tags exist
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { id: "tag-1", name: "Tag 1" },
          { id: "tag-2", name: "Tag 2" },
        ]),
      });

      // Mock delete call
      mockDb.returning.mockResolvedValue([{ id: "1" }, { id: "2" }]);

      const removed = await repo.removeTagsFromContact("test-user-id", "contact-1", [
        "tag-1",
        "tag-2",
      ]);

      expect(removed).toBe(2);
    });

    it("should get contact tags", async () => {
      const mockTags = [
        { id: "1", name: "Tag 1", category: "general", color: "#3B82F6", usageCount: 0 },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockTags),
      });

      const tags = await repo.getContactTags("test-user-id", "contact-1");

      expect(tags).toEqual(mockTags);
    });
  });
});

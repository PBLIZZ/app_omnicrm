import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  listTagsService,
  createTagService,
  getTagByIdService,
  updateTagService,
  deleteTagService,
  countTagsService,
  applyTagsService,
  removeTagsService,
  getEntityTagsService,
  deleteTagsBulkService,
  getTagUsageStatsService,
} from "../tags.service";
import { AppError } from "@/lib/errors/app-error";

// Mock the database client
vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

// Mock the repository
vi.mock("@repo", () => ({
  createTagsRepository: vi.fn(),
}));

describe("TagsService", () => {
  let mockDb: any;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      listTags: vi.fn(),
      createTag: vi.fn(),
      getTagById: vi.fn(),
      getTagByName: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
      countTags: vi.fn(),
      applyTagsToContact: vi.fn(),
      applyTagsToTask: vi.fn(),
      applyTagsToNote: vi.fn(),
      applyTagsToGoal: vi.fn(),
      removeTagsFromContact: vi.fn(),
      removeTagsFromTask: vi.fn(),
      removeTagsFromNote: vi.fn(),
      removeTagsFromGoal: vi.fn(),
      getContactTags: vi.fn(),
      getTaskTags: vi.fn(),
      getNoteTags: vi.fn(),
      getGoalTags: vi.fn(),
      deleteTagsByIds: vi.fn(),
      getTagUsageStats: vi.fn(),
    };

    mockDb = {};

    const { getDb } = await import("@/server/db/client");
    const { createTagsRepository } = await import("@repo");

    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(createTagsRepository).mockReturnValue(mockRepo);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("listTagsService", () => {
    it("should list tags with pagination", async () => {
      const mockTags = [
        { id: "1", name: "Tag 1", category: "general", color: "#3B82F6", usageCount: 0 },
        { id: "2", name: "Tag 2", category: "client", color: "#10B981", usageCount: 5 },
      ];

      mockRepo.listTags.mockResolvedValue({
        items: mockTags,
        total: 2,
      });

      const result = await listTagsService("test-user-id", {
        page: 1,
        pageSize: 10,
        search: "Tag",
        category: "general",
        sort: "name",
        order: "asc",
      });

      expect(mockRepo.listTags).toHaveBeenCalledWith("test-user-id", {
        page: 1,
        pageSize: 10,
        search: "Tag",
        category: "general",
        sort: "name",
        order: "asc",
      });

      expect(result).toMatchObject({
        items: mockTags,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it("should handle database errors", async () => {
      mockRepo.listTags.mockRejectedValue(new Error("Database error"));

      await expect(listTagsService("test-user-id", { page: 1, pageSize: 10 })).rejects.toThrow(
        AppError,
      );
    });
  });

  describe("createTagService", () => {
    it("should create a tag successfully", async () => {
      const mockTag = {
        id: "1",
        name: "Test Tag",
        category: "general",
        color: "#3B82F6",
        usageCount: 0,
        userId: "test-user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.getTagByName.mockResolvedValue(null);
      mockRepo.createTag.mockResolvedValue(mockTag);

      const result = await createTagService("test-user-id", {
        name: "Test Tag",
        category: "general",
        color: "#3B82F6",
      });

      expect(mockRepo.getTagByName).toHaveBeenCalledWith("test-user-id", "Test Tag");
      expect(mockRepo.createTag).toHaveBeenCalledWith({
        userId: "test-user-id",
        name: "Test Tag",
        category: "general",
        color: "#3B82F6",
        isSystem: false,
      });

      expect(result).toEqual(mockTag);
    });

    it("should throw error if tag name already exists", async () => {
      const existingTag = {
        id: "1",
        name: "Test Tag",
        category: "general",
        color: "#3B82F6",
        usageCount: 0,
      };

      mockRepo.getTagByName.mockResolvedValue(existingTag);

      await expect(
        createTagService("test-user-id", {
          name: "Test Tag",
          category: "general",
          color: "#3B82F6",
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe("getTagByIdService", () => {
    it("should get tag by ID", async () => {
      const mockTag = {
        id: "1",
        name: "Test Tag",
        category: "general",
        color: "#3B82F6",
        usageCount: 0,
        userId: "test-user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.getTagById.mockResolvedValue(mockTag);

      const result = await getTagByIdService("test-user-id", "1");

      expect(mockRepo.getTagById).toHaveBeenCalledWith("test-user-id", "1");
      expect(result).toEqual(mockTag);
    });

    it("should throw error if tag not found", async () => {
      mockRepo.getTagById.mockResolvedValue(null);

      await expect(getTagByIdService("test-user-id", "non-existent-id")).rejects.toThrow(AppError);
    });
  });

  describe("updateTagService", () => {
    it("should update tag successfully", async () => {
      const existingTag = {
        id: "1",
        name: "Old Name",
        category: "general",
        color: "#3B82F6",
        usageCount: 0,
        userId: "test-user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedTag = {
        ...existingTag,
        name: "New Name",
        color: "#EF4444",
      };

      mockRepo.getTagById.mockResolvedValue(existingTag);
      mockRepo.getTagByName.mockResolvedValue(null);
      mockRepo.updateTag.mockResolvedValue(updatedTag);

      const result = await updateTagService("test-user-id", "1", {
        name: "New Name",
        color: "#EF4444",
      });

      expect(mockRepo.getTagById).toHaveBeenCalledWith("test-user-id", "1");
      expect(mockRepo.getTagByName).toHaveBeenCalledWith("test-user-id", "New Name");
      expect(mockRepo.updateTag).toHaveBeenCalledWith("test-user-id", "1", {
        name: "New Name",
        color: "#EF4444",
      });

      expect(result).toEqual(updatedTag);
    });

    it("should throw error if tag not found", async () => {
      mockRepo.getTagById.mockResolvedValue(null);

      await expect(
        updateTagService("test-user-id", "non-existent-id", { name: "New Name" }),
      ).rejects.toThrow(AppError);
    });

    it("should throw error if new name conflicts", async () => {
      const existingTag = {
        id: "1",
        name: "Old Name",
        category: "general",
        color: "#3B82F6",
        usageCount: 0,
        userId: "test-user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const conflictingTag = {
        id: "2",
        name: "New Name",
        category: "general",
        color: "#3B82F6",
        usageCount: 0,
        userId: "test-user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.getTagById.mockResolvedValue(existingTag);
      mockRepo.getTagByName.mockResolvedValue(conflictingTag);

      await expect(updateTagService("test-user-id", "1", { name: "New Name" })).rejects.toThrow(
        AppError,
      );
    });
  });

  describe("deleteTagService", () => {
    it("should delete tag successfully", async () => {
      const existingTag = {
        id: "1",
        name: "Test Tag",
        category: "general",
        color: "#3B82F6",
        usageCount: 0,
        userId: "test-user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.getTagById.mockResolvedValue(existingTag);
      mockRepo.deleteTag.mockResolvedValue(true);

      const result = await deleteTagService("test-user-id", "1");

      expect(mockRepo.getTagById).toHaveBeenCalledWith("test-user-id", "1");
      expect(mockRepo.deleteTag).toHaveBeenCalledWith("test-user-id", "1");
      expect(result).toBe(true);
    });

    it("should throw error if tag not found", async () => {
      mockRepo.getTagById.mockResolvedValue(null);

      await expect(deleteTagService("test-user-id", "non-existent-id")).rejects.toThrow(AppError);
    });
  });

  describe("countTagsService", () => {
    it("should count tags", async () => {
      mockRepo.countTags.mockResolvedValue(5);

      const result = await countTagsService("test-user-id", "search", "general");

      expect(mockRepo.countTags).toHaveBeenCalledWith("test-user-id", "search", "general");
      expect(result).toBe(5);
    });
  });

  describe("applyTagsService", () => {
    it("should apply tags to contact", async () => {
      mockRepo.applyTagsToContact.mockResolvedValue([]);

      const result = await applyTagsService("test-user-id", {
        entityType: "contact",
        entityId: "contact-1",
        tagIds: ["tag-1", "tag-2"],
      });

      expect(mockRepo.applyTagsToContact).toHaveBeenCalledWith(
        "test-user-id",
        "contact-1",
        ["tag-1", "tag-2"],
        "test-user-id",
      );
      expect(result).toEqual({ applied: 2 });
    });

    it("should apply tags to task", async () => {
      mockRepo.applyTagsToTask.mockResolvedValue([]);

      const result = await applyTagsService("test-user-id", {
        entityType: "task",
        entityId: "task-1",
        tagIds: ["tag-1"],
      });

      expect(mockRepo.applyTagsToTask).toHaveBeenCalledWith("test-user-id", "task-1", ["tag-1"]);
      expect(result).toEqual({ applied: 1 });
    });

    it("should throw error for invalid entity type", async () => {
      await expect(
        applyTagsService("test-user-id", {
          entityType: "invalid" as any,
          entityId: "entity-1",
          tagIds: ["tag-1"],
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe("removeTagsService", () => {
    it("should remove tags from contact", async () => {
      mockRepo.removeTagsFromContact.mockResolvedValue(2);

      const result = await removeTagsService("test-user-id", {
        entityType: "contact",
        entityId: "contact-1",
        tagIds: ["tag-1", "tag-2"],
      });

      expect(mockRepo.removeTagsFromContact).toHaveBeenCalledWith("test-user-id", "contact-1", [
        "tag-1",
        "tag-2",
      ]);
      expect(result).toEqual({ removed: 2 });
    });

    it("should throw error for invalid entity type", async () => {
      await expect(
        removeTagsService("test-user-id", {
          entityType: "invalid" as any,
          entityId: "entity-1",
          tagIds: ["tag-1"],
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe("getEntityTagsService", () => {
    it("should get tags for contact", async () => {
      const mockTags = [
        { id: "1", name: "Tag 1", category: "general", color: "#3B82F6", usageCount: 0 },
      ];

      mockRepo.getContactTags.mockResolvedValue(mockTags);

      const result = await getEntityTagsService("test-user-id", "contact", "contact-1");

      expect(mockRepo.getContactTags).toHaveBeenCalledWith("test-user-id", "contact-1");
      expect(result).toEqual(mockTags);
    });

    it("should throw error for invalid entity type", async () => {
      await expect(
        getEntityTagsService("test-user-id", "invalid" as any, "entity-1"),
      ).rejects.toThrow(AppError);
    });
  });

  describe("deleteTagsBulkService", () => {
    it("should bulk delete tags", async () => {
      mockRepo.deleteTagsByIds.mockResolvedValue(3);

      const result = await deleteTagsBulkService("test-user-id", {
        ids: ["tag-1", "tag-2", "tag-3"],
      });

      expect(mockRepo.deleteTagsByIds).toHaveBeenCalledWith("test-user-id", [
        "tag-1",
        "tag-2",
        "tag-3",
      ]);
      expect(result).toEqual({
        deleted: 3,
        errors: [],
      });
    });
  });

  describe("getTagUsageStatsService", () => {
    it("should get tag usage statistics", async () => {
      const mockStats = [
        { tagId: "1", usageCount: 5, entityType: "tag" },
        { tagId: "2", usageCount: 3, entityType: "tag" },
      ];

      mockRepo.getTagUsageStats.mockResolvedValue(mockStats);

      const result = await getTagUsageStatsService("test-user-id");

      expect(mockRepo.getTagUsageStats).toHaveBeenCalledWith("test-user-id");
      expect(result).toEqual(mockStats);
    });
  });
});

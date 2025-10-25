/**
 * Tags Service Layer
 *
 * Business logic and orchestration.
 * - Unwraps errors from repos → throws AppError
 * - Data enrichment and validation
 * - Business rule validation
 */

import { createTagsRepository } from "@repo";
import type { Tag } from "@/server/db/schema";
import { tags } from "@/server/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/observability";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import type {
  CreateTagBody,
  UpdateTagBody,
  ApplyTagsBody,
  RemoveTagsBody,
  BulkDeleteTagsBody,
  BulkDeleteTagsResponse,
  TagUsageStats,
  ContactWithTags,
  TaskWithTags,
  NoteWithTags,
  GoalWithTags,
} from "@/server/db/business-schemas/tags";

// ============================================================================
// SERVICE LAYER TYPES
// ============================================================================

export type TagListParams = {
  search?: string;
  category?: "services_modalities" | "client_demographics" | "schedule_attendance" | "health_wellness" | "marketing_engagement" | "emotional_mental";
  sort?: "name" | "usageCount" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
  page: number;
  pageSize: number;
};

// ============================================================================
// TAG CRUD OPERATIONS
// ============================================================================

/**
 * List tags with pagination and filtering
 */
export async function listTagsService(
  userId: string,
  params: TagListParams,
): Promise<{
  items: Tag[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    const { items, total } = await repo.listTags(userId, {
      page: params.page,
      pageSize: params.pageSize,
      ...(params.search !== undefined && { search: params.search }),
      ...(params.category !== undefined && { category: params.category }),
      ...(params.sort !== undefined && { sort: params.sort }),
      ...(params.order !== undefined && { order: params.order }),
    });

    const totalPages = Math.ceil(total / params.pageSize);

    return {
      items,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages,
        hasNext: params.page < totalPages,
        hasPrev: params.page > 1,
      },
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to list tags",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get single tag by ID
 */
export async function getTagByIdService(userId: string, tagId: string): Promise<Tag> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    const tag = await repo.getTagById(userId, tagId);

    if (!tag) {
      throw new AppError("Tag not found", "TAG_NOT_FOUND", "validation", false);
    }

    return tag;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get tag",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Create new tag
 */
export async function createTagService(userId: string, input: CreateTagBody): Promise<Tag> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    // Check if tag with same name already exists (case-insensitive)
    const existingTag = await repo.getTagByName(userId, input.name);
    if (existingTag) {
      throw new AppError(
        "Tag with this name already exists",
        "TAG_NAME_EXISTS",
        "validation",
        false,
      );
    }

    const tag = await repo.createTag({
      userId,
      name: input.name,
      category: input.category,
      color: input.color,
      isSystem: false,
    });

    return tag;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create tag",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Update existing tag
 * Users can update any tag they can see (their own or global tags)
 */
export async function updateTagService(
  userId: string,
  tagId: string,
  input: UpdateTagBody,
): Promise<Tag> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    // Check if tag exists
    const existingTag = await repo.getTagById(userId, tagId);
    if (!existingTag) {
      throw new AppError("Tag not found", "TAG_NOT_FOUND", "validation", false);
    }

    // If updating name, check for conflicts
    if (input.name && input.name !== existingTag.name) {
      const nameConflict = await repo.getTagByName(userId, input.name);
      if (nameConflict) {
        throw new AppError(
          "Tag with this name already exists",
          "TAG_NAME_EXISTS",
          "validation",
          false,
        );
      }
    }

    const cleanUpdates = Object.fromEntries(
      Object.entries(input).filter(([_, v]) => v !== undefined),
    ) as Partial<UpdateTagBody>;

    const tag = await repo.updateTag(userId, tagId, cleanUpdates);

    if (!tag) {
      throw new AppError("Tag not found", "TAG_NOT_FOUND", "validation", false);
    }

    return tag;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to update tag",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Delete tag
 * Users can delete any tag they can see (including starter tags they don't want)
 */
export async function deleteTagService(userId: string, tagId: string): Promise<boolean> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    // Check if tag exists
    const existingTag = await repo.getTagById(userId, tagId);
    if (!existingTag) {
      throw new AppError("Tag not found", "TAG_NOT_FOUND", "validation", false);
    }

    return await repo.deleteTag(userId, tagId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete tag",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Count tags with optional filters
 */
export async function countTagsService(
  userId: string,
  search?: string,
  category?: "services_modalities" | "client_demographics" | "schedule_attendance" | "health_wellness" | "marketing_engagement" | "emotional_mental",
): Promise<number> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    return await repo.countTags(userId, search, category);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to count tags",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

// ============================================================================
// TAG APPLICATION OPERATIONS
// ============================================================================

/**
 * Apply tags to an entity
 */
export async function applyTagsService(
  userId: string,
  input: ApplyTagsBody,
): Promise<{ applied: number }> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    let applied = 0;

    switch (input.entityType) {
      case "contact":
        await repo.applyTagsToContact(userId, input.entityId, input.tagIds, userId);
        applied = input.tagIds.length;
        break;
      case "task":
        await repo.applyTagsToTask(userId, input.entityId, input.tagIds);
        applied = input.tagIds.length;
        break;
      case "note":
        await repo.applyTagsToNote(userId, input.entityId, input.tagIds);
        applied = input.tagIds.length;
        break;
      case "goal":
        await repo.applyTagsToGoal(userId, input.entityId, input.tagIds);
        applied = input.tagIds.length;
        break;
      default:
        throw new AppError("Invalid entity type", "INVALID_ENTITY_TYPE", "validation", false);
    }

    return { applied };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to apply tags",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Remove tags from an entity
 */
export async function removeTagsService(
  userId: string,
  input: RemoveTagsBody,
): Promise<{ removed: number }> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    let removed = 0;

    switch (input.entityType) {
      case "contact":
        removed = await repo.removeTagsFromContact(userId, input.entityId, input.tagIds);
        break;
      case "task":
        removed = await repo.removeTagsFromTask(userId, input.entityId, input.tagIds);
        break;
      case "note":
        removed = await repo.removeTagsFromNote(userId, input.entityId, input.tagIds);
        break;
      case "goal":
        removed = await repo.removeTagsFromGoal(userId, input.entityId, input.tagIds);
        break;
      default:
        throw new AppError("Invalid entity type", "INVALID_ENTITY_TYPE", "validation", false);
    }

    return { removed };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to remove tags",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get tags for an entity
 */
export async function getEntityTagsService(
  userId: string,
  entityType: "contact" | "task" | "note" | "goal",
  entityId: string,
): Promise<Tag[]> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    switch (entityType) {
      case "contact":
        return await repo.getContactTags(userId, entityId);
      case "task":
        return await repo.getTaskTags(userId, entityId);
      case "note":
        return await repo.getNoteTags(userId, entityId);
      case "goal":
        return await repo.getGoalTags(userId, entityId);
      default:
        throw new AppError("Invalid entity type", "INVALID_ENTITY_TYPE", "validation", false);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get entity tags",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk delete tags
 */
export async function deleteTagsBulkService(
  userId: string,
  request: BulkDeleteTagsBody,
): Promise<BulkDeleteTagsResponse> {
  const { ids } = request;
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    const deletedCount = await repo.deleteTagsByIds(userId, ids);

    // Log for audit
    await logger.info("Bulk deleted tags", {
      operation: "tags_bulk_delete",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        deletedCount,
        requestedIds: ids.length,
      },
    });

    return {
      deleted: deletedCount,
      errors: [],
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to bulk delete tags",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

// ============================================================================
// ONBOARDING - STARTER TAGS
// ============================================================================

/**
 * Claim starter tags for user
 * Converts all global tags (userId = null) to user-owned tags
 */
export async function claimStarterTagsService(userId: string): Promise<{ claimed: number }> {
  const db = await getDb();

  try {
    // Update all global tags to be owned by this user
    const result = await db
      .update(tags)
      .set({ userId, updatedAt: new Date() })
      .where(sql`${tags.userId} IS NULL`)
      .returning({ id: tags.id });

    return { claimed: result.length };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to claim starter tags",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Reject starter tags for user
 * Deletes all global tags (userId = null)
 */
export async function rejectStarterTagsService(): Promise<{ deleted: number }> {
  const db = await getDb();

  try {
    // Delete all global tags
    const result = await db
      .delete(tags)
      .where(sql`${tags.userId} IS NULL`)
      .returning({ id: tags.id });

    return { deleted: result.length };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to reject starter tags",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

// ============================================================================
// ANALYTICS AND STATISTICS
// ============================================================================

/**
 * Get tag usage statistics
 */
export async function getTagUsageStatsService(userId: string): Promise<TagUsageStats[]> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    return await repo.getTagUsageStats(userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get tag usage stats",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

// ============================================================================
// ENTITY ENRICHMENT WITH TAGS
// ============================================================================

/**
 * Get contact with tags
 */
export async function getContactWithTagsService(
  userId: string,
  contactId: string,
): Promise<ContactWithTags> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    // This would need to be implemented with a proper contacts service
    // For now, we'll just get the tags
    await repo.getContactTags(userId, contactId);

    // This is a placeholder - in a real implementation, you'd fetch the contact
    // from the contacts service and combine with tags
    throw new AppError(
      "Contact with tags not yet implemented",
      "NOT_IMPLEMENTED",
      "validation",
      false,
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get contact with tags",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get task with tags
 */
export async function getTaskWithTagsService(
  userId: string,
  taskId: string,
): Promise<TaskWithTags> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    // This would need to be implemented with a proper tasks service
    // For now, we'll just get the tags
    await repo.getTaskTags(userId, taskId);

    // This is a placeholder - in a real implementation, you'd fetch the task
    // from the tasks service and combine with tags
    throw new AppError(
      "Task with tags not yet implemented",
      "NOT_IMPLEMENTED",
      "validation",
      false,
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get task with tags",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get note with tags
 */
export async function getNoteWithTagsService(
  userId: string,
  noteId: string,
): Promise<NoteWithTags> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    // This would need to be implemented with a proper notes service
    // For now, we'll just get the tags
    await repo.getNoteTags(userId, noteId);

    // This is a placeholder - in a real implementation, you'd fetch the note
    // from the notes service and combine with tags
    throw new AppError(
      "Note with tags not yet implemented",
      "NOT_IMPLEMENTED",
      "validation",
      false,
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get note with tags",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get goal with tags
 */
export async function getGoalWithTagsService(
  userId: string,
  goalId: string,
): Promise<GoalWithTags> {
  const db = await getDb();
  const repo = createTagsRepository(db);

  try {
    // This would need to be implemented with a proper goals service
    // For now, we'll just get the tags
    await repo.getGoalTags(userId, goalId);

    // This is a placeholder - in a real implementation, you'd fetch the goal
    // from the goals service and combine with tags
    throw new AppError(
      "Goal with tags not yet implemented",
      "NOT_IMPLEMENTED",
      "validation",
      false,
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get goal with tags",
      "DB_ERROR",
      "database",
      false,
    );
  }
}


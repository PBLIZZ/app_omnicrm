import { eq, and, ilike, desc, asc, inArray, count, sql } from "drizzle-orm";
import {
  tags,
  contactTags,
  taskTags,
  noteTags,
  goalTags,
  type Tag,
  type CreateTag,
  type ContactTag,
  type TaskTag,
  type NoteTag,
  type GoalTag,
} from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

/**
 * Tags Repository
 *
 * Pure database operations - no business logic, no validation.
 * Uses DbClient constructor injection pattern.
 * Throws errors on failure - no Result wrapper.
 */

export class TagsRepository {
  constructor(private readonly db: DbClient) {}

  // ============================================================================
  // TAG CRUD OPERATIONS
  // ============================================================================

  /**
   * List tags with pagination and search
   * Returns all tags for user (includes global tags with userId = null)
   */
  async listTags(
    userId: string,
    params: {
      search?: string;
      category?: "services_modalities" | "client_demographics" | "schedule_attendance" | "health_wellness" | "marketing_engagement" | "emotional_mental";
      sort?: "name" | "usageCount" | "createdAt" | "updatedAt";
      order?: "asc" | "desc";
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<{ items: Tag[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const offset = (page - 1) * pageSize;
    const sortKey = params.sort ?? "updatedAt";
    const sortDir = params.order === "desc" ? desc : asc;

    // Get tags for this user OR global tags (userId = null)
    const conditions = [sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`];

    if (params.search) {
      conditions.push(ilike(tags.name, `%${params.search}%`));
    }

    if (params.category) {
      conditions.push(eq(tags.category, params.category));
    }

    // Count total
    const countResult = await this.db
      .select({ count: count() })
      .from(tags)
      .where(and(...conditions));

    const totalRow = countResult[0];
    const total = totalRow?.count ?? 0;

    // Fetch items
    const sortColumnMap = {
      name: tags.name,
      usageCount: tags.usageCount,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    } as const;

    const items = await this.db
      .select()
      .from(tags)
      .where(and(...conditions))
      .orderBy(sortDir(sortColumnMap[sortKey]))
      .limit(pageSize)
      .offset(offset);

    return { items, total };
  }

  /**
   * Get single tag by ID
   * Returns user tag or global tag
   */
  async getTagById(userId: string, tagId: string): Promise<Tag | null> {
    const rows = await this.db
      .select()
      .from(tags)
      .where(and(sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`, eq(tags.id, tagId)))
      .limit(1);

    return rows.length > 0 && rows[0] ? rows[0] : null;
  }

  /**
   * Get tag by name (case-insensitive)
   * Returns user tag or global tag
   */
  async getTagByName(userId: string, name: string): Promise<Tag | null> {
    const rows = await this.db
      .select()
      .from(tags)
      .where(
        and(
          sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`,
          sql`LOWER(${tags.name}) = LOWER(${name})`,
        ),
      )
      .limit(1);

    return rows.length > 0 && rows[0] ? rows[0] : null;
  }

  /**
   * Create new tag
   */
  async createTag(data: CreateTag): Promise<Tag> {
    const [tag] = await this.db.insert(tags).values(data).returning();

    if (!tag) {
      throw new Error("Insert returned no data");
    }

    return tag;
  }

  /**
   * Update existing tag
   * Allows updating user's own tags or global tags (userId = null)
   */
  async updateTag(
    userId: string,
    tagId: string,
    updates: Record<string, unknown>,
  ): Promise<Tag | null> {
    const [tag] = await this.db
      .update(tags)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(tags.id, tagId), sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`))
      .returning();

    return tag ?? null;
  }

  /**
   * Delete tag
   * Can delete user's own tags or global tags
   */
  async deleteTag(userId: string, tagId: string): Promise<boolean> {
    const result = await this.db
      .delete(tags)
      .where(and(eq(tags.id, tagId), sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`))
      .returning({ id: tags.id });

    return result.length > 0;
  }

  /**
   * Get multiple tags by IDs
   * Returns user tags and global tags
   */
  async getTagsByIds(userId: string, tagIds: string[]): Promise<Tag[]> {
    if (tagIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select()
      .from(tags)
      .where(and(sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`, inArray(tags.id, tagIds)));

    return rows;
  }

  /**
   * Count tags with optional search and category filter
   * Includes user tags and global tags
   */
  async countTags(
    userId: string,
    search?: string,
    category?: "services_modalities" | "client_demographics" | "schedule_attendance" | "health_wellness" | "marketing_engagement" | "emotional_mental",
  ): Promise<number> {
    const conditions = [sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`];

    if (search) {
      conditions.push(ilike(tags.name, `%${search}%`));
    }

    if (category) {
      conditions.push(eq(tags.category, category));
    }

    const result = await this.db
      .select({ count: count() })
      .from(tags)
      .where(and(...conditions));

    const row = result[0];
    return row?.count ?? 0;
  }

  // ============================================================================
  // CONTACT TAG OPERATIONS
  // ============================================================================

  /**
   * Apply tags to contact
   */
  async applyTagsToContact(
    userId: string,
    contactId: string,
    tagIds: string[],
    createdBy: string,
  ): Promise<ContactTag[]> {
    if (tagIds.length === 0) {
      return [];
    }

    // Verify all tags belong to user
    const userTags = await this.getTagsByIds(userId, tagIds);
    if (userTags.length !== tagIds.length) {
      throw new Error("One or more tags not found or not owned by user");
    }

    const contactTagData = tagIds.map((tagId) => ({
      contactId,
      tagId,
      createdBy,
    }));

    const result = await this.db.insert(contactTags).values(contactTagData).returning();

    return result;
  }

  /**
   * Remove tags from contact
   */
  async removeTagsFromContact(
    userId: string,
    contactId: string,
    tagIds: string[],
  ): Promise<number> {
    if (tagIds.length === 0) {
      return 0;
    }

    // Verify all tags belong to user
    const userTags = await this.getTagsByIds(userId, tagIds);
    if (userTags.length !== tagIds.length) {
      throw new Error("One or more tags not found or not owned by user");
    }

    const result = await this.db
      .delete(contactTags)
      .where(and(eq(contactTags.contactId, contactId), inArray(contactTags.tagId, tagIds)))
      .returning({ id: contactTags.id });

    return result.length;
  }

  /**
   * Get tags for contact
   */
  async getContactTags(userId: string, contactId: string): Promise<Tag[]> {
    const rows = await this.db
      .select({
        id: tags.id,
        userId: tags.userId,
        name: tags.name,
        category: tags.category,
        color: tags.color,
        isSystem: tags.isSystem,
        usageCount: tags.usageCount,
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt,
      })
      .from(contactTags)
      .innerJoin(tags, eq(contactTags.tagId, tags.id))
      .where(and(eq(contactTags.contactId, contactId), sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`));

    return rows;
  }

  /**
   * Get contacts with specific tag
   */
  async getContactsByTag(userId: string, tagId: string): Promise<string[]> {
    const rows = await this.db
      .select({ contactId: contactTags.contactId })
      .from(contactTags)
      .innerJoin(tags, eq(contactTags.tagId, tags.id))
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)));

    return rows.map((row) => row.contactId);
  }

  // ============================================================================
  // TASK TAG OPERATIONS
  // ============================================================================

  /**
   * Apply tags to task
   */
  async applyTagsToTask(userId: string, taskId: string, tagIds: string[]): Promise<TaskTag[]> {
    if (tagIds.length === 0) {
      return [];
    }

    // Verify all tags belong to user
    const userTags = await this.getTagsByIds(userId, tagIds);
    if (userTags.length !== tagIds.length) {
      throw new Error("One or more tags not found or not owned by user");
    }

    const taskTagData = tagIds.map((tagId) => ({
      taskId,
      tagId,
    }));

    const result = await this.db.insert(taskTags).values(taskTagData).returning();

    return result;
  }

  /**
   * Remove tags from task
   */
  async removeTagsFromTask(userId: string, taskId: string, tagIds: string[]): Promise<number> {
    if (tagIds.length === 0) {
      return 0;
    }

    // Verify all tags belong to user
    const userTags = await this.getTagsByIds(userId, tagIds);
    if (userTags.length !== tagIds.length) {
      throw new Error("One or more tags not found or not owned by user");
    }

    const result = await this.db
      .delete(taskTags)
      .where(and(eq(taskTags.taskId, taskId), inArray(taskTags.tagId, tagIds)))
      .returning({ id: taskTags.id });

    return result.length;
  }

  /**
   * Get tags for task
   */
  async getTaskTags(userId: string, taskId: string): Promise<Tag[]> {
    const rows = await this.db
      .select({
        id: tags.id,
        userId: tags.userId,
        name: tags.name,
        category: tags.category,
        color: tags.color,
        isSystem: tags.isSystem,
        usageCount: tags.usageCount,
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt,
      })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(and(eq(taskTags.taskId, taskId), sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`));

    return rows;
  }

  // ============================================================================
  // NOTE TAG OPERATIONS
  // ============================================================================

  /**
   * Apply tags to note
   */
  async applyTagsToNote(userId: string, noteId: string, tagIds: string[]): Promise<NoteTag[]> {
    if (tagIds.length === 0) {
      return [];
    }

    // Verify all tags belong to user
    const userTags = await this.getTagsByIds(userId, tagIds);
    if (userTags.length !== tagIds.length) {
      throw new Error("One or more tags not found or not owned by user");
    }

    const noteTagData = tagIds.map((tagId) => ({
      noteId,
      tagId,
    }));

    const result = await this.db.insert(noteTags).values(noteTagData).returning();

    return result;
  }

  /**
   * Remove tags from note
   */
  async removeTagsFromNote(userId: string, noteId: string, tagIds: string[]): Promise<number> {
    if (tagIds.length === 0) {
      return 0;
    }

    // Verify all tags belong to user
    const userTags = await this.getTagsByIds(userId, tagIds);
    if (userTags.length !== tagIds.length) {
      throw new Error("One or more tags not found or not owned by user");
    }

    const result = await this.db
      .delete(noteTags)
      .where(and(eq(noteTags.noteId, noteId), inArray(noteTags.tagId, tagIds)))
      .returning({ id: noteTags.id });

    return result.length;
  }

  /**
   * Get tags for note
   */
  async getNoteTags(userId: string, noteId: string): Promise<Tag[]> {
    const rows = await this.db
      .select({
        id: tags.id,
        userId: tags.userId,
        name: tags.name,
        category: tags.category,
        color: tags.color,
        isSystem: tags.isSystem,
        usageCount: tags.usageCount,
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt,
      })
      .from(noteTags)
      .innerJoin(tags, eq(noteTags.tagId, tags.id))
      .where(and(eq(noteTags.noteId, noteId), sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`));

    return rows;
  }

  // ============================================================================
  // GOAL TAG OPERATIONS
  // ============================================================================

  /**
   * Apply tags to goal
   */
  async applyTagsToGoal(userId: string, goalId: string, tagIds: string[]): Promise<GoalTag[]> {
    if (tagIds.length === 0) {
      return [];
    }

    // Verify all tags belong to user
    const userTags = await this.getTagsByIds(userId, tagIds);
    if (userTags.length !== tagIds.length) {
      throw new Error("One or more tags not found or not owned by user");
    }

    const goalTagData = tagIds.map((tagId) => ({
      goalId,
      tagId,
    }));

    const result = await this.db.insert(goalTags).values(goalTagData).returning();

    return result;
  }

  /**
   * Remove tags from goal
   */
  async removeTagsFromGoal(userId: string, goalId: string, tagIds: string[]): Promise<number> {
    if (tagIds.length === 0) {
      return 0;
    }

    // Verify all tags belong to user
    const userTags = await this.getTagsByIds(userId, tagIds);
    if (userTags.length !== tagIds.length) {
      throw new Error("One or more tags not found or not owned by user");
    }

    const result = await this.db
      .delete(goalTags)
      .where(and(eq(goalTags.goalId, goalId), inArray(goalTags.tagId, tagIds)))
      .returning({ id: goalTags.id });

    return result.length;
  }

  /**
   * Get tags for goal
   */
  async getGoalTags(userId: string, goalId: string): Promise<Tag[]> {
    const rows = await this.db
      .select({
        id: tags.id,
        userId: tags.userId,
        name: tags.name,
        category: tags.category,
        color: tags.color,
        isSystem: tags.isSystem,
        usageCount: tags.usageCount,
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt,
      })
      .from(goalTags)
      .innerJoin(tags, eq(goalTags.tagId, tags.id))
      .where(and(eq(goalTags.goalId, goalId), sql`(${tags.userId} = ${userId} OR ${tags.userId} IS NULL)`));

    return rows;
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Bulk delete tags
   */
  async deleteTagsByIds(userId: string, tagIds: string[]): Promise<number> {
    if (tagIds.length === 0) {
      return 0;
    }

    const result = await this.db
      .delete(tags)
      .where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)));

    return result.count ?? 0;
  }

  /**
   * Get tag usage statistics
   */
  async getTagUsageStats(
    userId: string,
  ): Promise<Array<{ tagId: string; usageCount: number; entityType: string }>> {
    const stats = await this.db
      .select({
        tagId: tags.id,
        usageCount: tags.usageCount,
        entityType: sql<string>`'tag'`,
      })
      .from(tags)
      .where(eq(tags.userId, userId))
      .orderBy(desc(tags.usageCount));

    return stats;
  }
}

export function createTagsRepository(db: DbClient): TagsRepository {
  return new TagsRepository(db);
}


import { eq, and, desc, ilike, inArray, sql } from "drizzle-orm";
import { inboxItems } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import type { InboxItem, CreateInboxItem } from "@/server/db/schema";
import { ok, err, DbResult } from "@/lib/utils/result";

// Local type aliases for repository layer
type InboxItemDTO = InboxItem;
type CreateInboxItemDTO = CreateInboxItem;
type UpdateInboxItemDTO = Partial<CreateInboxItem>;
type InboxItemStatus = "unprocessed" | "processed" | "archived";

interface InboxFilters {
  status?: InboxItemStatus[];
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export class InboxRepository {
  /**
   * List inbox items for a user with optional filtering
   */
  static async listInboxItems(
    userId: string,
    filters?: InboxFilters,
  ): Promise<DbResult<InboxItemDTO[]>> {
    try {
      const db = await getDb();

      // Build conditions array
      const conditions = [eq(inboxItems.userId, userId)];

      if (filters?.status && filters.status.length > 0) {
        conditions.push(inArray(inboxItems.status, filters.status));
      }

      if (filters?.search) {
        conditions.push(ilike(inboxItems.rawText, `%${filters.search}%`));
      }

      if (filters?.createdAfter) {
        conditions.push(sql`${inboxItems.createdAt} >= ${filters.createdAfter}`);
      }

      if (filters?.createdBefore) {
        conditions.push(sql`${inboxItems.createdAt} <= ${filters.createdBefore}`);
      }

      const query = db
        .select({
          id: inboxItems.id,
          userId: inboxItems.userId,
          rawText: inboxItems.rawText,
          status: inboxItems.status,
          createdTaskId: inboxItems.createdTaskId,
          processedAt: inboxItems.processedAt,
          createdAt: inboxItems.createdAt,
          updatedAt: inboxItems.updatedAt,
        })
        .from(inboxItems)
        .where(and(...conditions))
        .orderBy(desc(inboxItems.createdAt));

      const rows = await query;
      return ok(rows.map((row) => row));
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to list inbox items",
        details: error,
      });
    }
  }

  /**
   * Get a single inbox item by ID
   */
  static async getInboxItemById(userId: string, itemId: string): Promise<InboxItemDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: inboxItems.id,
        userId: inboxItems.userId,
        rawText: inboxItems.rawText,
        status: inboxItems.status,
        createdTaskId: inboxItems.createdTaskId,
        processedAt: inboxItems.processedAt,
        createdAt: inboxItems.createdAt,
        updatedAt: inboxItems.updatedAt,
      })
      .from(inboxItems)
      .where(and(eq(inboxItems.userId, userId), eq(inboxItems.id, itemId)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0] ?? null;
  }

  /**
   * Create a new inbox item
   */
  static async createInboxItem(
    data: CreateInboxItemDTO & { userId: string },
  ): Promise<InboxItemDTO> {
    const db = await getDb();

    const insertValues = {
      userId: data.userId,
      rawText: data.rawText,
      status: "unprocessed" as const,
      createdTaskId: null,
      processedAt: null,
    };

    const [newItem] = await db.insert(inboxItems).values(insertValues).returning({
      id: inboxItems.id,
      userId: inboxItems.userId,
      rawText: inboxItems.rawText,
      status: inboxItems.status,
      createdTaskId: inboxItems.createdTaskId,
      processedAt: inboxItems.processedAt,
      createdAt: inboxItems.createdAt,
      updatedAt: inboxItems.updatedAt,
    });

    if (!newItem) {
      throw new Error("Failed to create inbox item - no data returned");
    }

    return newItem;
  }

  /**
   * Update an existing inbox item
   */
  static async updateInboxItem(
    userId: string,
    itemId: string,
    data: UpdateInboxItemDTO,
  ): Promise<InboxItemDTO | null> {
    const db = await getDb();

    const updateValues = {
      updatedAt: new Date(),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.createdTaskId !== undefined && { createdTaskId: data.createdTaskId ?? null }),
      ...(data.status === "processed" && { processedAt: new Date() }),
    };

    const [updatedItem] = await db
      .update(inboxItems)
      .set(updateValues)
      .where(and(eq(inboxItems.userId, userId), eq(inboxItems.id, itemId)))
      .returning({
        id: inboxItems.id,
        userId: inboxItems.userId,
        rawText: inboxItems.rawText,
        status: inboxItems.status,
        createdTaskId: inboxItems.createdTaskId,
        processedAt: inboxItems.processedAt,
        createdAt: inboxItems.createdAt,
        updatedAt: inboxItems.updatedAt,
      });

    if (!updatedItem) {
      return null;
    }

    return updatedItem;
  }

  /**
   * Delete an inbox item
   */
  static async deleteInboxItem(userId: string, itemId: string): Promise<boolean> {
    const db = await getDb();

    const result = await db
      .delete(inboxItems)
      .where(and(eq(inboxItems.userId, userId), eq(inboxItems.id, itemId)));

    return result.length > 0;
  }

  /**
   * Mark multiple inbox items with a status
   */
  static async bulkUpdateStatus(
    userId: string,
    itemIds: string[],
    status: InboxItemStatus,
  ): Promise<InboxItemDTO[]> {
    if (itemIds.length === 0) {
      return [];
    }

    const db = await getDb();

    const updateValues = {
      status,
      updatedAt: new Date(),
      ...(status === "processed" && { processedAt: new Date() }),
    };

    const updatedItems = await db
      .update(inboxItems)
      .set(updateValues)
      .where(and(eq(inboxItems.userId, userId), inArray(inboxItems.id, itemIds)))
      .returning({
        id: inboxItems.id,
        userId: inboxItems.userId,
        rawText: inboxItems.rawText,
        status: inboxItems.status,
        createdTaskId: inboxItems.createdTaskId,
        processedAt: inboxItems.processedAt,
        createdAt: inboxItems.createdAt,
        updatedAt: inboxItems.updatedAt,
      });

    return updatedItems.map((item) => item);
  }

  /**
   * Delete multiple inbox items by IDs
   */
  static async bulkDeleteInboxItems(userId: string, itemIds: string[]): Promise<number> {
    if (itemIds.length === 0) {
      return 0;
    }

    const db = await getDb();

    // Count items to delete first
    const countRows = await db
      .select({ n: sql<number>`count(*)` })
      .from(inboxItems)
      .where(and(eq(inboxItems.userId, userId), inArray(inboxItems.id, itemIds)))
      .limit(1);
    const n = countRows[0]?.n ?? 0;

    if (n === 0) {
      return 0;
    }

    // Delete the items
    await db
      .delete(inboxItems)
      .where(and(eq(inboxItems.userId, userId), inArray(inboxItems.id, itemIds)));

    return n;
  }

  /**
   * Count inbox items by status for a user
   */
  static async getInboxStats(userId: string): Promise<{
    unprocessed: number;
    processed: number;
    archived: number;
    total: number;
  }> {
    const db = await getDb();

    const result = await db
      .select({
        status: inboxItems.status,
        count: sql<number>`count(*)`,
      })
      .from(inboxItems)
      .where(eq(inboxItems.userId, userId))
      .groupBy(inboxItems.status);

    const stats = {
      unprocessed: 0,
      processed: 0,
      archived: 0,
      total: 0,
    };

    for (const row of result) {
      const status = row.status as InboxItemStatus;
      const count = row.count;
      stats[status] = count;
      stats.total += count;
    }

    return stats;
  }

  /**
   * Get unprocessed inbox items for AI processing
   */
  static async getUnprocessedItems(userId: string, limit = 10): Promise<InboxItemDTO[]> {
    const db = await getDb();

    const rows = await db
      .select({
        id: inboxItems.id,
        userId: inboxItems.userId,
        rawText: inboxItems.rawText,
        status: inboxItems.status,
        createdTaskId: inboxItems.createdTaskId,
        processedAt: inboxItems.processedAt,
        createdAt: inboxItems.createdAt,
        updatedAt: inboxItems.updatedAt,
      })
      .from(inboxItems)
      .where(and(eq(inboxItems.userId, userId), eq(inboxItems.status, "unprocessed")))
      .orderBy(desc(inboxItems.createdAt))
      .limit(limit);

    return rows.map((row) => row);
  }

  /**
   * Mark an inbox item as processed with created task reference
   */
  static async markAsProcessed(
    userId: string,
    itemId: string,
    createdTaskId?: string,
  ): Promise<InboxItemDTO | null> {
    const db = await getDb();

    const updateValues = {
      status: "processed" as const,
      processedAt: new Date(),
      updatedAt: new Date(),
      ...(createdTaskId && { createdTaskId }),
    };

    const [updatedItem] = await db
      .update(inboxItems)
      .set(updateValues)
      .where(and(eq(inboxItems.userId, userId), eq(inboxItems.id, itemId)))
      .returning({
        id: inboxItems.id,
        userId: inboxItems.userId,
        rawText: inboxItems.rawText,
        status: inboxItems.status,
        createdTaskId: inboxItems.createdTaskId,
        processedAt: inboxItems.processedAt,
        createdAt: inboxItems.createdAt,
        updatedAt: inboxItems.updatedAt,
      });

    if (!updatedItem) {
      return null;
    }

    return updatedItem;
  }
}

import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";

import { inboxItems } from "@/server/db/schema";
import type { CreateInboxItem, InboxItem } from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

type InboxItemDTO = InboxItem;
type CreateInboxItemDTO = CreateInboxItem;
type UpdateInboxItemDTO = Partial<CreateInboxItem>;
type InboxItemStatus = "unprocessed" | "processed" | "archived";

export interface InboxFilters {
  status?: InboxItemStatus[];
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export class InboxRepository {
  constructor(private readonly db: DbClient) {}

  async listInboxItems(userId: string, filters: InboxFilters = {}): Promise<InboxItemDTO[]> {
    const conditions = [eq(inboxItems.userId, userId)];

    if (filters.status?.length) {
      conditions.push(inArray(inboxItems.status, filters.status));
    }

    if (filters.search) {
      conditions.push(ilike(inboxItems.rawText, `%${filters.search}%`));
    }

    if (filters.createdAfter) {
      conditions.push(sql`${inboxItems.createdAt} >= ${filters.createdAfter}`);
    }

    if (filters.createdBefore) {
      conditions.push(sql`${inboxItems.createdAt} <= ${filters.createdBefore}`);
    }

    const rows = await this.db
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

    return rows.map((row) => row);
  }

  async getInboxItemById(userId: string, itemId: string): Promise<InboxItemDTO | null> {
    const [row] = await this.db
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

    return row ?? null;
  }

  async createInboxItem(data: CreateInboxItemDTO & { userId: string }): Promise<InboxItemDTO> {
    const [newItem] = await this.db
      .insert(inboxItems)
      .values({
        userId: data.userId,
        rawText: data.rawText,
        status: "unprocessed",
        createdTaskId: null,
        processedAt: null,
      })
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

    if (!newItem) {
      throw new Error("Failed to create inbox item - no data returned");
    }

    return newItem;
  }

  async updateInboxItem(
    userId: string,
    itemId: string,
    data: UpdateInboxItemDTO,
  ): Promise<InboxItemDTO | null> {
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) {
      updateValues["status"] = data.status;
      if (data.status === "processed") {
        updateValues["processedAt"] = new Date();
      }
    }

    if (data.createdTaskId !== undefined) {
      updateValues["createdTaskId"] = data.createdTaskId ?? null;
    }

    const [updatedItem] = await this.db
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

    return updatedItem ?? null;
  }

  async deleteInboxItem(userId: string, itemId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(inboxItems)
      .where(and(eq(inboxItems.userId, userId), eq(inboxItems.id, itemId)))
      .returning({ id: inboxItems.id });

    return deleted.length > 0;
  }

  async bulkUpdateStatus(
    userId: string,
    itemIds: string[],
    status: InboxItemStatus,
  ): Promise<InboxItemDTO[]> {
    if (itemIds.length === 0) {
      return [];
    }

    const updatedItems = await this.db
      .update(inboxItems)
      .set({
        status,
        updatedAt: new Date(),
        ...(status === "processed" ? { processedAt: new Date() } : {}),
      })
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

  async bulkDeleteInboxItems(userId: string, itemIds: string[]): Promise<number> {
    if (itemIds.length === 0) {
      return 0;
    }

    const [{ n = 0 } = {}] = await this.db
      .select({ n: sql<number>`count(*)` })
      .from(inboxItems)
      .where(and(eq(inboxItems.userId, userId), inArray(inboxItems.id, itemIds)))
      .limit(1);

    if (n === 0) {
      return 0;
    }

    await this.db
      .delete(inboxItems)
      .where(and(eq(inboxItems.userId, userId), inArray(inboxItems.id, itemIds)));

    return n;
  }

  async getInboxStats(
    userId: string,
  ): Promise<{ unprocessed: number; processed: number; archived: number; total: number }> {
    const rows = await this.db
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
    } satisfies Record<InboxItemStatus | "total", number>;

    for (const row of rows) {
      const status = (row.status ?? "unprocessed") as InboxItemStatus;
      const count = row.count;
      stats[status] = count;
      stats.total += count;
    }

    return stats;
  }

  async getUnprocessedItems(userId: string, limit = 10): Promise<InboxItemDTO[]> {
    const rows = await this.db
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

  async markAsProcessed(
    userId: string,
    itemId: string,
    createdTaskId?: string,
  ): Promise<InboxItemDTO | null> {
    const [updatedItem] = await this.db
      .update(inboxItems)
      .set({
        status: "processed",
        processedAt: new Date(),
        updatedAt: new Date(),
        ...(createdTaskId ? { createdTaskId } : {}),
      })
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

    return updatedItem ?? null;
  }
}

export function createInboxRepository(db: DbClient): InboxRepository {
  return new InboxRepository(db);
}

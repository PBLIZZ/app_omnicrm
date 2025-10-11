import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";

import type { DbClient } from "@/server/db/client";
import {
  interactions,
  type CreateInteraction,
  type Interaction,
  type UpdateInteraction,
} from "@/server/db/schema";

export type InteractionListParams = {
  contactId?: string;
  types?: string[];
  sources?: string[];
  search?: string;
  occurredAfter?: Date;
  occurredBefore?: Date;
  page?: number;
  pageSize?: number;
  sort?: "occurredAt" | "createdAt";
  order?: "asc" | "desc";
};

const sortColumnMap = {
  occurredAt: interactions.occurredAt,
  createdAt: interactions.createdAt,
} as const;

export class InteractionsRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * List interactions for a user with pagination and filtering.
   */
  async listInteractions(
    userId: string,
    params: InteractionListParams = {},
  ): Promise<{ items: Interaction[]; total: number }> {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 200);
    const offset = (page - 1) * pageSize;

    const conditions = [eq(interactions.userId, userId)];

    if (params.contactId) {
      conditions.push(eq(interactions.contactId, params.contactId));
    }

    if (params.types && params.types.length > 0) {
      conditions.push(inArray(interactions.type, params.types));
    }

    if (params.sources && params.sources.length > 0) {
      conditions.push(inArray(interactions.source, params.sources));
    }

    if (params.occurredAfter) {
      conditions.push(gte(interactions.occurredAt, params.occurredAfter));
    }

    if (params.occurredBefore) {
      conditions.push(lte(interactions.occurredAt, params.occurredBefore));
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      const searchCondition = or(
        ilike(interactions.subject, searchTerm),
        ilike(interactions.bodyText, searchTerm),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const whereClause = and(...conditions);
    const sortKey = params.sort ?? "occurredAt";
    const order = params.order === "asc" ? asc : desc;

    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(interactions)
        .where(whereClause)
        .orderBy(order(sortColumnMap[sortKey]))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(interactions).where(whereClause),
    ]);

    return {
      items: rows,
      total: Number(totalRow[0]?.value ?? 0),
    };
  }

  /**
   * Fetch a single interaction by ID.
   */
  async getInteractionById(userId: string, interactionId: string): Promise<Interaction | null> {
    const rows = await this.db
      .select()
      .from(interactions)
      .where(and(eq(interactions.userId, userId), eq(interactions.id, interactionId)))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find interaction by source + sourceId (used for upsert flows).
   */
  async findBySource(
    userId: string,
    source: string,
    sourceId: string,
  ): Promise<Interaction | null> {
    const rows = await this.db
      .select()
      .from(interactions)
      .where(
        and(
          eq(interactions.userId, userId),
          eq(interactions.source, source),
          eq(interactions.sourceId, sourceId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Create a new interaction.
   */
  async createInteraction(data: CreateInteraction & { userId: string }): Promise<Interaction> {
    const insertValues: CreateInteraction & { userId: string } = {
      userId: data.userId,
      contactId: data.contactId ?? null,
      type: data.type,
      subject: data.subject ?? null,
      bodyText: data.bodyText ?? null,
      occurredAt: data.occurredAt,
      source: data.source ?? null,
      sourceId: data.sourceId ?? null,
      sourceMeta: data.sourceMeta ?? null,
      batchId: data.batchId ?? null,
      createdAt: data.createdAt,
    };

    const [created] = await this.db.insert(interactions).values(insertValues).returning();

    if (!created) {
      throw new Error("Insert returned no data");
    }

    return created;
  }

  /**
   * Bulk insert interactions for ingestion pipelines.
   */
  async createInteractionsBulk(
    items: Array<CreateInteraction & { userId: string }>,
  ): Promise<Interaction[]> {
    if (items.length === 0) {
      return [];
    }

    const rows = await this.db
      .insert(interactions)
      .values(
        items.map((item) => ({
          userId: item.userId,
          contactId: item.contactId ?? null,
          type: item.type,
          subject: item.subject ?? null,
          bodyText: item.bodyText ?? null,
          occurredAt: item.occurredAt,
          source: item.source ?? null,
          sourceId: item.sourceId ?? null,
          sourceMeta: item.sourceMeta ?? null,
          batchId: item.batchId ?? null,
          createdAt: item.createdAt,
        })),
      )
      .returning();

    return rows;
  }

  /**
   * Update an interaction's editable fields.
   */
  async updateInteraction(
    userId: string,
    interactionId: string,
    updates: UpdateInteraction,
  ): Promise<Interaction | null> {
    const sanitized: Record<string, unknown> = {};

    if (updates.contactId !== undefined) sanitized["contactId"] = updates.contactId;
    if (updates.type !== undefined) sanitized["type"] = updates.type;
    if (updates.subject !== undefined) sanitized["subject"] = updates.subject ?? null;
    if (updates.bodyText !== undefined) sanitized["bodyText"] = updates.bodyText ?? null;
    if (updates.occurredAt !== undefined) sanitized["occurredAt"] = updates.occurredAt;
    if (updates.source !== undefined) sanitized["source"] = updates.source ?? null;
    if (updates.sourceId !== undefined) sanitized["sourceId"] = updates.sourceId ?? null;
    if (updates.sourceMeta !== undefined) sanitized["sourceMeta"] = updates.sourceMeta ?? null;
    if (updates.batchId !== undefined) sanitized["batchId"] = updates.batchId ?? null;

    if (Object.keys(sanitized).length === 0) {
      throw new Error("No fields provided for update");
    }

    const [updated] = await this.db
      .update(interactions)
      .set(sanitized)
      .where(and(eq(interactions.userId, userId), eq(interactions.id, interactionId)))
      .returning();

    return updated ?? null;
  }

  /**
   * Delete a single interaction by ID.
   */
  async deleteInteraction(userId: string, interactionId: string): Promise<number> {
    const deleted = await this.db
      .delete(interactions)
      .where(and(eq(interactions.userId, userId), eq(interactions.id, interactionId)))
      .returning({ id: interactions.id });

    return deleted.length;
  }

  /**
   * Delete all interactions in a batch (used for sync resets).
   */
  async deleteInteractionsByBatch(userId: string, batchId: string): Promise<number> {
    const deleted = await this.db
      .delete(interactions)
      .where(and(eq(interactions.userId, userId), eq(interactions.batchId, batchId)))
      .returning({ id: interactions.id });

    return deleted.length;
  }

  /**
   * Count interactions (optionally scoped by contact or type).
   */
  async countInteractions(
    userId: string,
    criteria: { contactId?: string; types?: string[] } = {},
  ): Promise<number> {
    const conditions = [eq(interactions.userId, userId)];

    if (criteria.contactId) {
      conditions.push(eq(interactions.contactId, criteria.contactId));
    }

    if (criteria.types && criteria.types.length > 0) {
      conditions.push(inArray(interactions.type, criteria.types));
    }

    const result = await this.db
      .select({ value: count() })
      .from(interactions)
      .where(and(...conditions));

    return Number(result[0]?.value ?? 0);
  }

  /**
   * Return aggregated counts grouped by interaction type.
   */
  async getTypeBreakdown(userId: string): Promise<Array<{ type: string; total: number }>> {
    const totalExpr = count(interactions.id).as("total");

    const rows = await this.db
      .select({
        type: interactions.type,
        total: totalExpr,
      })
      .from(interactions)
      .where(eq(interactions.userId, userId))
      .groupBy(interactions.type)
      .orderBy(desc(totalExpr));

    return rows.map((row) => ({
      type: row.type ?? "unknown",
      total: Number(row.total),
    }));
  }

  /**
   * Fetch the most recent interaction for a contact.
   */
  async latestInteractionForContact(
    userId: string,
    contactId: string,
  ): Promise<Interaction | null> {
    const rows = await this.db
      .select()
      .from(interactions)
      .where(and(eq(interactions.userId, userId), eq(interactions.contactId, contactId)))
      .orderBy(desc(interactions.occurredAt))
      .limit(1);

    return rows[0] ?? null;
  }
}

export function createInteractionsRepository(db: DbClient): InteractionsRepository {
  return new InteractionsRepository(db);
}

import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import {
  interactions,
  type CreateInteraction,
  type Interaction,
  type UpdateInteraction,
} from "@/server/db/schema";
import { dbError, ok, type DbResult } from "@/lib/utils/result";

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
  /**
   * List interactions for a user with pagination and filtering.
   */
  static async listInteractions(
    userId: string,
    params: InteractionListParams = {},
  ): Promise<DbResult<{ items: Interaction[]; total: number }>> {
    try {
      const db = await getDb();

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
        db
          .select()
          .from(interactions)
          .where(whereClause)
          .orderBy(order(sortColumnMap[sortKey]))
          .limit(pageSize)
          .offset(offset),
        db.select({ value: count() }).from(interactions).where(whereClause),
      ]);

      return ok({
        items: rows,
        total: Number(totalRow[0]?.value ?? 0),
      });
    } catch (error) {
      return dbError(
        "DB_QUERY_FAILED",
        "Failed to list interactions",
        error instanceof Error ? error : String(error),
      );
    }
  }

  /**
   * Fetch a single interaction by ID.
   */
  static async getInteractionById(
    userId: string,
    interactionId: string,
  ): Promise<DbResult<Interaction | null>> {
    try {
      const db = await getDb();
      const rows = await db
        .select()
        .from(interactions)
        .where(and(eq(interactions.userId, userId), eq(interactions.id, interactionId)))
        .limit(1);

      return ok(rows[0] ?? null);
    } catch (error) {
      return dbError(
        "DB_QUERY_FAILED",
        "Failed to load interaction",
        error instanceof Error ? error : String(error),
      );
    }
  }

  /**
   * Find interaction by source + sourceId (used for upsert flows).
   */
  static async findBySource(
    userId: string,
    source: string,
    sourceId: string,
  ): Promise<DbResult<Interaction | null>> {
    try {
      const db = await getDb();
      const rows = await db
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

      return ok(rows[0] ?? null);
    } catch (error) {
      return dbError(
        "DB_QUERY_FAILED",
        "Failed to find interaction by source",
        error instanceof Error ? error : String(error),
      );
    }
  }

  /**
   * Create a new interaction.
   */
  static async createInteraction(
    data: CreateInteraction & { userId: string },
  ): Promise<DbResult<Interaction>> {
    try {
      const db = await getDb();

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

      const [created] = await db.insert(interactions).values(insertValues).returning();

      if (!created) {
        return dbError("DB_INSERT_FAILED", "Insert returned no data");
      }

      return ok(created);
    } catch (error) {
      return dbError(
        "DB_INSERT_FAILED",
        "Failed to create interaction",
        error instanceof Error ? error : String(error),
      );
    }
  }

  /**
   * Bulk insert interactions for ingestion pipelines.
   */
  static async createInteractionsBulk(
    items: Array<CreateInteraction & { userId: string }>,
  ): Promise<DbResult<Interaction[]>> {
    try {
      if (items.length === 0) {
        return ok([]);
      }

      const db = await getDb();

      const rows = await db
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

      return ok(rows);
    } catch (error) {
      return dbError(
        "DB_INSERT_FAILED",
        "Failed to bulk insert interactions",
        error instanceof Error ? error : String(error),
      );
    }
  }

  /**
   * Update an interaction's editable fields.
   */
  static async updateInteraction(
    userId: string,
    interactionId: string,
    updates: UpdateInteraction,
  ): Promise<DbResult<Interaction | null>> {
    try {
      const db = await getDb();

      const sanitized: Record<string, unknown> = {};

      if (updates.contactId !== undefined) sanitized.contactId = updates.contactId;
      if (updates.type !== undefined) sanitized.type = updates.type;
      if (updates.subject !== undefined) sanitized.subject = updates.subject ?? null;
      if (updates.bodyText !== undefined) sanitized.bodyText = updates.bodyText ?? null;
      if (updates.occurredAt !== undefined) sanitized.occurredAt = updates.occurredAt;
      if (updates.source !== undefined) sanitized.source = updates.source ?? null;
      if (updates.sourceId !== undefined) sanitized.sourceId = updates.sourceId ?? null;
      if (updates.sourceMeta !== undefined) sanitized.sourceMeta = updates.sourceMeta ?? null;
      if (updates.batchId !== undefined) sanitized.batchId = updates.batchId ?? null;

      if (Object.keys(sanitized).length === 0) {
        return dbError("DB_UPDATE_FAILED", "No fields provided for update");
      }

      const [updated] = await db
        .update(interactions)
        .set(sanitized)
        .where(and(eq(interactions.userId, userId), eq(interactions.id, interactionId)))
        .returning();

      return ok(updated ?? null);
    } catch (error) {
      return dbError(
        "DB_UPDATE_FAILED",
        "Failed to update interaction",
        error instanceof Error ? error : String(error),
      );
    }
  }

  /**
   * Delete a single interaction by ID.
   */
  static async deleteInteraction(
    userId: string,
    interactionId: string,
  ): Promise<DbResult<number>> {
    try {
      const db = await getDb();

      const deleted = await db
        .delete(interactions)
        .where(and(eq(interactions.userId, userId), eq(interactions.id, interactionId)))
        .returning({ id: interactions.id });

      return ok(deleted.length);
    } catch (error) {
      return dbError(
        "DB_DELETE_FAILED",
        "Failed to delete interaction",
        error instanceof Error ? error : String(error),
      );
    }
  }

  /**
   * Delete all interactions in a batch (used for sync resets).
   */
  static async deleteInteractionsByBatch(
    userId: string,
    batchId: string,
  ): Promise<DbResult<number>> {
    try {
      const db = await getDb();

      const deleted = await db
        .delete(interactions)
        .where(and(eq(interactions.userId, userId), eq(interactions.batchId, batchId)))
        .returning({ id: interactions.id });

      return ok(deleted.length);
    } catch (error) {
      return dbError(
        "DB_DELETE_FAILED",
        "Failed to delete interaction batch",
        error instanceof Error ? error : String(error),
      );
    }
  }

  /**
   * Count interactions (optionally scoped by contact or type).
   */
  static async countInteractions(
    userId: string,
    criteria: { contactId?: string; types?: string[] } = {},
  ): Promise<DbResult<number>> {
    try {
      const db = await getDb();

      const conditions = [eq(interactions.userId, userId)];

      if (criteria.contactId) {
        conditions.push(eq(interactions.contactId, criteria.contactId));
      }

      if (criteria.types && criteria.types.length > 0) {
        conditions.push(inArray(interactions.type, criteria.types));
      }

      const result = await db
        .select({ value: count() })
        .from(interactions)
        .where(and(...conditions));

      return ok(Number(result[0]?.value ?? 0));
    } catch (error) {
      return dbError(
        "DB_QUERY_FAILED",
        "Failed to count interactions",
        error instanceof Error ? error : String(error),
      );
    }
  }

  /**
   * Return aggregated counts grouped by interaction type.
   */
  static async getTypeBreakdown(
    userId: string,
  ): Promise<DbResult<Array<{ type: string; total: number }>>> {
    try {
      const db = await getDb();

      const totalExpr = count(interactions.id).as("total");

      const rows = await db
        .select({
          type: interactions.type,
          total: totalExpr,
        })
        .from(interactions)
        .where(eq(interactions.userId, userId))
        .groupBy(interactions.type)
        .orderBy(desc(totalExpr));

      return ok(
        rows.map((row) => ({
          type: row.type ?? "unknown",
          total: Number(row.total),
        })),
      );
    } catch (error) {
      return dbError(
        "DB_QUERY_FAILED",
        "Failed to compute interaction type breakdown",
        error instanceof Error ? error : String(error),
      );
    }
  }

  /**
   * Fetch the most recent interaction for a contact.
   */
  static async latestInteractionForContact(
    userId: string,
    contactId: string,
  ): Promise<DbResult<Interaction | null>> {
    try {
      const db = await getDb();

      const rows = await db
        .select()
        .from(interactions)
        .where(and(eq(interactions.userId, userId), eq(interactions.contactId, contactId)))
        .orderBy(desc(interactions.occurredAt))
        .limit(1);

      return ok(rows[0] ?? null);
    } catch (error) {
      return dbError(
        "DB_QUERY_FAILED",
        "Failed to load latest interaction",
        error instanceof Error ? error : String(error),
      );
    }
  }
}

import { and, asc, count, desc, eq, ilike, inArray, type InferSelectModel } from "drizzle-orm";

import type { DbClient } from "@/server/db/client";
import {
  ignoredIdentifiers,
  type CreateIgnoredIdentifier,
  type IgnoredIdentifier,
  type UpdateIgnoredIdentifier,
} from "@/server/db/schema";

export type IgnoredIdentifierListParams = {
  kinds?: string[];
  search?: string;
  page?: number;
  pageSize?: number;
  order?: "asc" | "desc";
};

const sortColumn = ignoredIdentifiers.createdAt;
type IgnoredIdentifierRow = InferSelectModel<typeof ignoredIdentifiers>;

export class IgnoredIdentifiersRepository {
  /**
   * List ignored identifiers for a user.
   */
  static async listIgnoredIdentifiers(
    db: DbClient,
    userId: string,
    params: IgnoredIdentifierListParams = {},
  ): Promise<{ items: IgnoredIdentifier[]; total: number }> {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 200);
    const offset = (page - 1) * pageSize;

    const conditions = [eq(ignoredIdentifiers.userId, userId)];

    if (params.kinds && params.kinds.length > 0) {
      conditions.push(inArray(ignoredIdentifiers.kind, params.kinds));
    }

    if (params.search) {
      const term = `%${params.search}%`;
      conditions.push(ilike(ignoredIdentifiers.value, term));
    }

    const whereClause = and(...conditions);
    const orderFn = params.order === "asc" ? asc : desc;

    const rows = (await db
      .select()
      .from(ignoredIdentifiers)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset(offset)) as IgnoredIdentifierRow[];

    const totalRow = (await db
      .select({ value: count() })
      .from(ignoredIdentifiers)
      .where(whereClause)) as Array<{ value: number | bigint }>;

    return {
      items: rows,
      total: Number(totalRow[0]?.value ?? 0),
    };
  }

  /**
   * Check if an identifier is ignored.
   */
  static async isIgnored(
    db: DbClient,
    userId: string,
    kind: string,
    value: string,
  ): Promise<boolean> {
    const rows = (await db
      .select({ id: ignoredIdentifiers.id })
      .from(ignoredIdentifiers)
      .where(
        and(
          eq(ignoredIdentifiers.userId, userId),
          eq(ignoredIdentifiers.kind, kind),
          eq(ignoredIdentifiers.value, value),
        ),
      )
      .limit(1)) as Array<{ id: string }>;

    return rows.length > 0;
  }

  /**
   * Create a new ignored identifier.
   */
  static async createIgnoredIdentifier(
    db: DbClient,
    data: CreateIgnoredIdentifier & { userId: string },
  ): Promise<IgnoredIdentifier> {
    const [created] = (await db.insert(ignoredIdentifiers).values(data).returning()) as IgnoredIdentifierRow[];

    if (!created) {
      throw new Error("Insert returned no data");
    }

    return created;
  }

  /**
   * Update an ignored identifier (currently only reason field is mutable).
   */
  static async updateIgnoredIdentifier(
    db: DbClient,
    userId: string,
    identifierId: string,
    updates: UpdateIgnoredIdentifier,
  ): Promise<IgnoredIdentifier | null> {
    if (Object.keys(updates).length === 0) {
      throw new Error("No fields provided for update");
    }

    const [updated] = (await db
      .update(ignoredIdentifiers)
      .set(updates)
      .where(and(eq(ignoredIdentifiers.userId, userId), eq(ignoredIdentifiers.id, identifierId)))
      .returning()) as IgnoredIdentifierRow[];

    return updated ?? null;
  }

  /**
   * Delete a single ignored identifier entry.
   */
  static async deleteIgnoredIdentifier(
    db: DbClient,
    userId: string,
    identifierId: string,
  ): Promise<number> {
    const deleted = (await db
      .delete(ignoredIdentifiers)
      .where(and(eq(ignoredIdentifiers.userId, userId), eq(ignoredIdentifiers.id, identifierId)))
      .returning({ id: ignoredIdentifiers.id })) as Array<{ id: string }>;

    return deleted.length;
  }

  /**
   * Delete all ignored identifiers for a user.
   */
  static async deleteIgnoredIdentifiersForUser(db: DbClient, userId: string): Promise<number> {
    const deleted = (await db
      .delete(ignoredIdentifiers)
      .where(eq(ignoredIdentifiers.userId, userId))
      .returning({ id: ignoredIdentifiers.id })) as Array<{ id: string }>;

    return deleted.length;
  }
}

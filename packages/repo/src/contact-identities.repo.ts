import { and, asc, count, desc, eq, ilike, inArray, isNull, type InferSelectModel } from "drizzle-orm";

import type { DbClient } from "@/server/db/client";
import {
  contactIdentities,
  type ContactIdentity,
  type CreateContactIdentity,
  type UpdateContactIdentity,
} from "@/server/db/schema";

export type ContactIdentityListParams = {
  contactId?: string;
  kinds?: string[];
  provider?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  order?: "asc" | "desc";
};

const sortColumn = contactIdentities.createdAt;
type ContactIdentityRow = InferSelectModel<typeof contactIdentities>;

export class ContactIdentitiesRepository {
  /**
   * List identities for a user with optional filters.
   */
  static async listContactIdentities(
    db: DbClient,
    userId: string,
    params: ContactIdentityListParams = {},
  ): Promise<{ items: ContactIdentity[]; total: number }> {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 200);
    const offset = (page - 1) * pageSize;

    const conditions = [eq(contactIdentities.userId, userId)];

    if (params.contactId) {
      conditions.push(eq(contactIdentities.contactId, params.contactId));
    }

    if (params.kinds && params.kinds.length > 0) {
      conditions.push(inArray(contactIdentities.kind, params.kinds));
    }

    if (params.provider) {
      conditions.push(eq(contactIdentities.provider, params.provider));
    }

    if (params.search) {
      const term = `%${params.search.toLowerCase()}%`;
      conditions.push(ilike(contactIdentities.value, term));
    }

    const whereClause = and(...conditions);
    const orderFn = params.order === "asc" ? asc : desc;

    const rows = (await db
      .select()
      .from(contactIdentities)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset(offset)) as ContactIdentityRow[];

    const totalRow = (await db
      .select({ value: count() })
      .from(contactIdentities)
      .where(whereClause)) as Array<{ value: number | bigint }>;

    return {
      items: rows,
      total: Number(totalRow[0]?.value ?? 0),
    };
  }

  /**
   * Find identity by unique constraints.
   */
  static async findByKindAndValue(
    db: DbClient,
    userId: string,
    kind: string,
    value: string,
    provider?: string | null,
  ): Promise<ContactIdentity | null> {
    const providerCondition = provider
      ? eq(contactIdentities.provider, provider)
      : isNull(contactIdentities.provider);

    const rows = (await db
      .select()
      .from(contactIdentities)
      .where(
        and(
          eq(contactIdentities.userId, userId),
          eq(contactIdentities.kind, kind),
          eq(contactIdentities.value, value),
          providerCondition,
        ),
      )
      .limit(1)) as ContactIdentityRow[];

    return rows[0] ?? null;
  }

  /**
   * Create a new contact identity.
   */
  static async createContactIdentity(
    db: DbClient,
    data: CreateContactIdentity & { userId: string },
  ): Promise<ContactIdentity> {
    const [created] = (await db.insert(contactIdentities).values(data).returning()) as ContactIdentityRow[];

    if (!created) {
      throw new Error("Insert returned no data");
    }

    return created;
  }

  /**
   * Bulk insert identities.
   */
  static async createContactIdentitiesBulk(
    db: DbClient,
    items: Array<CreateContactIdentity & { userId: string }>,
  ): Promise<ContactIdentity[]> {
    if (items.length === 0) {
      return [];
    }

    const rows = (await db.insert(contactIdentities).values(items).returning()) as ContactIdentityRow[];

    return rows;
  }

  /**
   * Update a contact identity.
   */
  static async updateContactIdentity(
    db: DbClient,
    userId: string,
    identityId: string,
    updates: UpdateContactIdentity,
  ): Promise<ContactIdentity | null> {
    if (Object.keys(updates).length === 0) {
      throw new Error("No fields provided for update");
    }

    const [updated] = (await db
      .update(contactIdentities)
      .set(updates)
      .where(and(eq(contactIdentities.userId, userId), eq(contactIdentities.id, identityId)))
      .returning()) as ContactIdentityRow[];

    return updated ?? null;
  }

  /**
   * Delete a contact identity by ID.
   */
  static async deleteContactIdentity(
    db: DbClient,
    userId: string,
    identityId: string,
  ): Promise<number> {
    const deleted = (await db
      .delete(contactIdentities)
      .where(and(eq(contactIdentities.userId, userId), eq(contactIdentities.id, identityId)))
      .returning({ id: contactIdentities.id })) as Array<{ id: string }>;

    return deleted.length;
  }

  /**
   * Delete identities for a contact (e.g., during merge).
   */
  static async deleteIdentitiesForContact(
    db: DbClient,
    userId: string,
    contactId: string,
  ): Promise<number> {
    const deleted = (await db
      .delete(contactIdentities)
      .where(and(eq(contactIdentities.userId, userId), eq(contactIdentities.contactId, contactId)))
      .returning({ id: contactIdentities.id })) as Array<{ id: string }>;

    return deleted.length;
  }
}

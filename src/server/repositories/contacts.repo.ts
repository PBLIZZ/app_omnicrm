// src/server/repositories/contacts.repo.ts
import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { contacts, notes } from "@/server/db/schema";

export type ContactListParams = {
  search?: string;
  sort?: "displayName" | "createdAt";
  order?: "asc" | "desc";
  page: number;
  pageSize: number;
  dateRange?: { from?: Date; to?: Date };
};

export type ContactListItem = {
  id: string;
  userId: string;
  displayName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
  notesCount: number;
  lastNote: string | null;
};

export async function listContacts(
  userId: string,
  params: ContactListParams,
): Promise<{ items: ContactListItem[]; total: number }> {
  const dbo = await getDb();

  let whereExpr: SQL<unknown> = eq(contacts.userId, userId);
  if (params.search) {
    const needle = `%${params.search}%`;
    whereExpr = and(
      whereExpr,
      or(
        ilike(contacts.displayName, needle),
        ilike(contacts.primaryEmail, needle),
        ilike(contacts.primaryPhone, needle),
      ),
    ) as SQL<unknown>;
  }
  if (params.dateRange?.from)
    whereExpr = and(
      whereExpr,
      gte(contacts.createdAt, params.dateRange.from as Date),
    ) as SQL<unknown>;
  if (params.dateRange?.to)
    whereExpr = and(
      whereExpr,
      lte(contacts.createdAt, params.dateRange.to as Date),
    ) as SQL<unknown>;

  const sortKey = params.sort ?? "displayName";
  const sortDir = params.order === "desc" ? "desc" : "asc";
  const orderExpr =
    sortKey === "createdAt"
      ? sortDir === "desc"
        ? desc(contacts.createdAt)
        : asc(contacts.createdAt)
      : sortDir === "desc"
        ? desc(contacts.displayName)
        : asc(contacts.displayName);

  const page = params.page;
  const pageSize = params.pageSize;

  const [items, totalRow] = await Promise.all([
    dbo
      .select({
        id: contacts.id,
        userId: contacts.userId,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        primaryPhone: contacts.primaryPhone,
        source: contacts.source,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
        notesCount: sql<number>`COALESCE((
          SELECT COUNT(*) 
          FROM ${notes} 
          WHERE ${notes.contactId} = ${contacts.id} 
          AND ${notes.userId} = ${contacts.userId}
        ), 0)`,
        lastNote: sql<string | null>`(
          SELECT ${notes.content}
          FROM ${notes}
          WHERE ${notes.contactId} = ${contacts.id}
          AND ${notes.userId} = ${contacts.userId}
          ORDER BY ${notes.createdAt} DESC
          LIMIT 1
        )`,
      })
      .from(contacts)
      .where(whereExpr)
      .orderBy(orderExpr)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    dbo
      .select({ n: sql<number>`count(*)` })
      .from(contacts)
      .where(whereExpr)
      .limit(1),
  ]);

  return {
    items: items.map((r) => ({
      id: r.id,
      userId: r.userId,
      displayName: r.displayName,
      primaryEmail: r.primaryEmail ?? null,
      primaryPhone: r.primaryPhone ?? null,
      source: r.source ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      notesCount: r.notesCount,
      lastNote: r.lastNote,
    })),
    total: Number(totalRow[0]?.n) || 0,
  };
}

export type CreateContactValues = {
  displayName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  source: "manual";
};

export async function createContact(
  userId: string,
  values: CreateContactValues,
): Promise<ContactListItem | null> {
  const dbo = await getDb();
  const [row] = await dbo
    .insert(contacts)
    .values({
      userId,
      displayName: values.displayName,
      primaryEmail: values.primaryEmail,
      primaryPhone: values.primaryPhone,
      source: values.source,
    })
    .returning({
      id: contacts.id,
      userId: contacts.userId,
      displayName: contacts.displayName,
      primaryEmail: contacts.primaryEmail,
      primaryPhone: contacts.primaryPhone,
      source: contacts.source,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    });
  
  if (!row) return null;
  
  // New contacts have 0 notes and no last note
  return {
    ...row,
    primaryEmail: row.primaryEmail ?? null,
    primaryPhone: row.primaryPhone ?? null,
    source: row.source ?? null,
    notesCount: 0,
    lastNote: null,
  };
}

// src/server/repositories/raw-events.repo.ts
import { and, asc, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { rawEvents } from "@/server/db/schema";

export type RawEventListParams = {
  provider?: string; // e.g. 'gmail'
  sort?: "occurredAt" | "createdAt";
  order?: "asc" | "desc";
  page: number;
  pageSize: number;
  dateRange?: { from?: Date; to?: Date }; // applied to occurredAt
};

export type RawEventListItem = {
  id: string;
  userId: string;
  provider: string;
  payload: unknown;
  contactId: string | null;
  occurredAt: Date;
  sourceMeta: unknown | null;
  batchId: string | null;
  sourceId: string | null;
  createdAt: Date;
};

export async function listRawEvents(
  userId: string,
  params: RawEventListParams,
): Promise<{ items: RawEventListItem[]; total: number }> {
  const dbo = await getDb();

  let whereExpr: SQL<unknown> = eq(rawEvents.userId, userId);
  if (params.provider) {
    whereExpr = and(whereExpr, eq(rawEvents.provider, params.provider)) as SQL<unknown>;
  }
  if (params.dateRange?.from)
    whereExpr = and(
      whereExpr,
      gte(rawEvents.occurredAt, params.dateRange.from as Date),
    ) as SQL<unknown>;
  if (params.dateRange?.to)
    whereExpr = and(
      whereExpr,
      lte(rawEvents.occurredAt, params.dateRange.to as Date),
    ) as SQL<unknown>;

  const sortKey = params.sort ?? "occurredAt";
  const sortDir = params.order === "desc" ? "desc" : "asc";
  const orderExpr =
    sortKey === "createdAt"
      ? sortDir === "desc"
        ? desc(rawEvents.createdAt)
        : asc(rawEvents.createdAt)
      : sortDir === "desc"
        ? desc(rawEvents.occurredAt)
        : asc(rawEvents.occurredAt);

  const page = params.page;
  const pageSize = params.pageSize;

  const [items, totalRow] = await Promise.all([
    dbo
      .select({
        id: rawEvents.id,
        userId: rawEvents.userId,
        provider: rawEvents.provider,
        payload: rawEvents.payload,
        contactId: rawEvents.contactId,
        occurredAt: rawEvents.occurredAt,
        sourceMeta: rawEvents.sourceMeta,
        batchId: rawEvents.batchId,
        sourceId: rawEvents.sourceId,
        createdAt: rawEvents.createdAt,
      })
      .from(rawEvents)
      .where(whereExpr)
      .orderBy(orderExpr)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    dbo
      .select({ n: sql<number>`count(*)` })
      .from(rawEvents)
      .where(whereExpr)
      .limit(1),
  ]);

  return {
    items: items.map((r) => ({
      id: r.id,
      userId: r.userId,
      provider: r.provider,
      payload: r.payload,
      contactId: r.contactId ?? null,
      occurredAt: r.occurredAt,
      sourceMeta: r.sourceMeta ?? null,
      batchId: r.batchId ?? null,
      sourceId: r.sourceId ?? null,
      createdAt: r.createdAt,
    })),
    total: Number(totalRow[0]?.n) || 0,
  };
}

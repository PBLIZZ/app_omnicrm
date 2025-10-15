import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
  type InferSelectModel,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import {
  rawEvents,
  type CreateRawEvent,
  type RawEvent,
  type UpdateRawEvent,
} from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

export type ProviderType = "gmail" | "calendar" | "drive" | "upload";

export type RawEventProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "skipped";

export type RawEventContactExtractionStatus =
  | "NO_IDENTIFIERS"
  | "IDENTIFIERS_FOUND"
  | "PENDING"
  | "YES"
  | "REJECTED";

export type RawEventListParams = {
  provider?: ProviderType[];
  processingStatus?: string[];
  contactExtractionStatus?: string[];
  occurredAfter?: Date;
  occurredBefore?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
  sort?: "createdAt" | "occurredAt";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  batchId?: string;
};

export type RawEventListItem = {
  id: string;
  userId: string;
  provider: ProviderType;
  payload: unknown;
  occurredAt: Date;
  sourceId: string; // Non-null per database schema
  sourceMeta: unknown | null;
  batchId: string | null;
  createdAt: Date | null;
  processingStatus: RawEventProcessingStatus;
  processingAttempts: number;
  processingError: string | null;
  processedAt: Date | null;
  contactExtractionStatus: RawEventContactExtractionStatus | null;
  extractedAt: Date | null;
};

const sortColumnMap = {
  createdAt: rawEvents.createdAt,
  occurredAt: rawEvents.occurredAt,
} as const;

type RawEventRow = InferSelectModel<typeof rawEvents>;

function mapRowToListItem(row: RawEventRow): RawEventListItem {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider as ProviderType,
    payload: row.payload,
    occurredAt: row.occurredAt,
    sourceId: row.sourceId,
    sourceMeta: row.sourceMeta,
    batchId: row.batchId,
    createdAt: row.createdAt,
    processingStatus: (row.processingStatus ?? "pending") as RawEventProcessingStatus,
    processingAttempts: row.processingAttempts ?? 0,
    processingError: row.processingError,
    processedAt: row.processedAt,
    contactExtractionStatus: row.contactExtractionStatus as RawEventContactExtractionStatus | null,
    extractedAt: row.extractedAt,
  };
}

export class RawEventsRepository {
  constructor(private readonly db: DbClient) {}

  async listRawEvents(
    userId: string,
    params: RawEventListParams = {},
  ): Promise<{ items: RawEventListItem[]; total: number }> {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 200);
    const offset = (page - 1) * pageSize;

    const conditions: SQL<unknown>[] = [eq(rawEvents.userId, userId)];

    if (params.provider && params.provider.length > 0) {
      conditions.push(inArray(rawEvents.provider, params.provider));
    }

    if (params.processingStatus && params.processingStatus.length > 0) {
      conditions.push(inArray(rawEvents.processingStatus, params.processingStatus));
    }

    if (params.contactExtractionStatus && params.contactExtractionStatus.length > 0) {
      conditions.push(inArray(rawEvents.contactExtractionStatus, params.contactExtractionStatus));
    }

    if (params.occurredAfter) {
      conditions.push(gte(rawEvents.occurredAt, params.occurredAfter));
    }

    if (params.occurredBefore) {
      conditions.push(lte(rawEvents.occurredAt, params.occurredBefore));
    }

    if (params.createdAfter) {
      conditions.push(gte(rawEvents.createdAt, params.createdAfter));
    }

    if (params.createdBefore) {
      conditions.push(lte(rawEvents.createdAt, params.createdBefore));
    }

    if (params.batchId) {
      conditions.push(eq(rawEvents.batchId, params.batchId));
    }

    const whereClause = and(...conditions);
    const sortKey = params.sort ?? "createdAt";
    const orderByColumn = sortColumnMap[sortKey];
    const orderDirection = params.order === "asc" ? asc : desc;

    const rows = (await this.db
      .select()
      .from(rawEvents)
      .where(whereClause)
      .orderBy(orderDirection(orderByColumn))
      .limit(pageSize)
      .offset(offset)) as RawEventRow[];

    const totalRows = (await this.db
      .select({ value: count() })
      .from(rawEvents)
      .where(whereClause)) as Array<{ value: number | bigint }>;

    return {
      items: rows.map((row) => mapRowToListItem(row)),
      total: Number(totalRows[0]?.value ?? 0),
    };
  }

  async getRawEventById(userId: string, rawEventId: string): Promise<RawEvent | null> {
    const rows = (await this.db
      .select()
      .from(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.id, rawEventId)))
      .limit(1)) as RawEventRow[];

    return rows[0] ?? null;
  }

  async createRawEvent(data: CreateRawEvent & { userId: string }): Promise<RawEvent> {
    const insertValues: CreateRawEvent & { userId: string } = {
      userId: data.userId,
      provider: data.provider,
      payload: data.payload,
      occurredAt: data.occurredAt,
      sourceId: data.sourceId ?? null,
      sourceMeta: data.sourceMeta ?? null,
      batchId: data.batchId ?? null,
      processingStatus: data.processingStatus ?? "pending",
      processingAttempts: data.processingAttempts ?? 0,
      processingError: data.processingError ?? null,
      processedAt: data.processedAt ?? null,
      contactExtractionStatus: data.contactExtractionStatus ?? null,
      extractedAt: data.extractedAt ?? null,
      createdAt: data.createdAt,
    };

    const [created] = (await this.db
      .insert(rawEvents)
      .values(insertValues)
      .returning()) as RawEventRow[];

    if (!created) {
      throw new Error("Insert returned no data");
    }

    return created;
  }

  async createRawEventsBulk(
    events: Array<CreateRawEvent & { userId: string }>,
  ): Promise<RawEvent[]> {
    if (events.length === 0) {
      return [];
    }

    const values = events.map((event) => ({
      userId: event.userId,
      provider: event.provider,
      payload: event.payload,
      occurredAt: event.occurredAt,
      sourceId: event.sourceId ?? null,
      sourceMeta: event.sourceMeta ?? null,
      batchId: event.batchId ?? null,
      processingStatus: event.processingStatus ?? "pending",
      processingAttempts: event.processingAttempts ?? 0,
      processingError: event.processingError ?? null,
      processedAt: event.processedAt ?? null,
      contactExtractionStatus: event.contactExtractionStatus ?? null,
      extractedAt: event.extractedAt ?? null,
      createdAt: event.createdAt,
    }));

    return (await this.db.insert(rawEvents).values(values).returning()) as RawEventRow[];
  }

  async updateRawEvent(
    userId: string,
    rawEventId: string,
    updates: UpdateRawEvent,
  ): Promise<RawEvent | null> {
    const sanitized: Record<string, unknown> = {};

    if (updates.provider !== undefined) sanitized["provider"] = updates.provider;
    if (updates.payload !== undefined) sanitized["payload"] = updates.payload;
    if (updates.occurredAt !== undefined) sanitized["occurredAt"] = updates.occurredAt;
    if (updates.sourceId !== undefined) sanitized["sourceId"] = updates.sourceId ?? null;
    if (updates.sourceMeta !== undefined) sanitized["sourceMeta"] = updates.sourceMeta ?? null;
    if (updates.batchId !== undefined) sanitized["batchId"] = updates.batchId ?? null;
    if (updates.processingStatus !== undefined)
      sanitized["processingStatus"] = updates.processingStatus ?? "pending";
    if (updates.processingAttempts !== undefined)
      sanitized["processingAttempts"] = updates.processingAttempts ?? 0;
    if (updates.processingError !== undefined)
      sanitized["processingError"] = updates.processingError ?? null;
    if (updates.processedAt !== undefined) sanitized["processedAt"] = updates.processedAt ?? null;
    if (updates.contactExtractionStatus !== undefined)
      sanitized["contactExtractionStatus"] = updates.contactExtractionStatus ?? null;
    if (updates.extractedAt !== undefined) sanitized["extractedAt"] = updates.extractedAt ?? null;

    if (Object.keys(sanitized).length === 0) {
      throw new Error("No fields provided for update");
    }

    const [updated] = (await this.db
      .update(rawEvents)
      .set(sanitized)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.id, rawEventId)))
      .returning()) as RawEventRow[];

    return updated ?? null;
  }

  async updateProcessingState(params: {
    userId: string;
    rawEventId: string;
    processingStatus: string;
    processingError?: string | null;
    processedAt?: Date | null;
    contactExtractionStatus?: string | null;
    extractedAt?: Date | null;
    incrementAttempts?: boolean;
  }): Promise<RawEvent | null> {
    const {
      userId,
      rawEventId,
      processingStatus,
      processingError,
      processedAt,
      contactExtractionStatus,
      extractedAt,
      incrementAttempts,
    } = params;

    const updates: Record<string, unknown> = {
      processingStatus,
    };

    if (processingError !== undefined) {
      updates["processingError"] = processingError;
    }

    if (processedAt !== undefined) {
      updates["processedAt"] = processedAt;
    }

    if (contactExtractionStatus !== undefined) {
      updates["contactExtractionStatus"] = contactExtractionStatus;
    }

    if (extractedAt !== undefined) {
      updates["extractedAt"] = extractedAt;
    }

    if (incrementAttempts) {
      updates["processingAttempts"] = sql`${rawEvents.processingAttempts} + 1`;
    }

    const [updated] = (await this.db
      .update(rawEvents)
      .set(updates)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.id, rawEventId)))
      .returning()) as RawEventRow[];

    return updated ?? null;
  }

  async deleteRawEventsByBatch(userId: string, batchId: string): Promise<number> {
    const deleted = (await this.db
      .delete(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.batchId, batchId)))
      .returning({ id: rawEvents.id })) as Array<{ id: string }>;

    return deleted.length;
  }

  async deleteRawEventsForUser(userId: string): Promise<number> {
    const deleted = (await this.db
      .delete(rawEvents)
      .where(eq(rawEvents.userId, userId))
      .returning({ id: rawEvents.id })) as Array<{ id: string }>;

    return deleted.length;
  }

  async findNextPendingEvents(userId: string, limit: number): Promise<RawEventListItem[]> {
    const rows = (await this.db
      .select()
      .from(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.processingStatus, "pending")))
      .orderBy(asc(rawEvents.createdAt))
      .limit(limit)) as RawEventRow[];

    return rows.map((row) => mapRowToListItem(row));
  }

  async getEmailCountByProvider(userId: string, provider: ProviderType): Promise<number> {
    const result = await this.db
      .select({ value: count() })
      .from(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, provider)))
      .limit(1);

    const rawCount: unknown = result[0]?.value ?? 0;
    const emailCount: number = typeof rawCount === 'string' 
      ? parseInt(rawCount, 10) 
      : typeof rawCount === 'number' 
      ? rawCount 
      : 0;

    return emailCount;
  }

  async getLatestEventByProvider(
    userId: string,
    provider: ProviderType
  ): Promise<RawEvent | null> {
    const rows = (await this.db
      .select()
      .from(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, provider)))
      .orderBy(desc(rawEvents.createdAt))
      .limit(1)) as RawEventRow[];

    return rows[0] ?? null;
  }
}

export function createRawEventsRepository(db: DbClient): RawEventsRepository {
  return new RawEventsRepository(db);
}

import { eq, and, desc, asc, gte, lte, inArray, count, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  RawEvent,
  CreateRawEvent,
  RawEventError,
  CreateRawEventError,
  rawEvents,
  rawEventErrors,
} from "@/server/db/schema";
import { ok, err, DbResult } from "@/lib/utils/result";

// Local type aliases for repository layer
type RawEventDTO = RawEvent;
type CreateRawEventDTO = CreateRawEvent;
type RawEventErrorDTO = RawEventError;
type CreateRawEventErrorDTO = CreateRawEventError;

interface RawEventFilters {
  provider?: string[];
  contactId?: string;
  batchId?: string;
  sourceId?: string;
  occurredAfter?: Date;
  occurredBefore?: Date;
}

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
  createdAt: Date | null;
};

export class RawEventsRepository {
  /**
   * Create a new raw event
   */
  static async createRawEvent(
    data: CreateRawEventDTO & { userId: string },
  ): Promise<DbResult<RawEventDTO>> {
    try {
      const db = await getDb();

      const insertValues = {
        userId: data.userId,
        provider: data.provider,
        payload: data.payload,
        contactId: data.contactId ?? null,
        occurredAt: data.occurredAt,
        sourceMeta: data.sourceMeta ?? null,
        batchId: data.batchId ?? null,
        sourceId: data.sourceId ?? null,
      };

      const [newRawEvent] = await db.insert(rawEvents).values(insertValues).returning({
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
      });

      if (!newRawEvent) {
        return err({
          code: "DB_INSERT_FAILED",
          message: "Failed to create raw event - no data returned",
        });
      }

      return ok(newRawEvent);
    } catch (error) {
      return err({
        code: "DB_INSERT_FAILED",
        message: error instanceof Error ? error.message : "Failed to create raw event",
        details: error,
      });
    }
  }

  /**
   * Bulk create raw events for batch ingestion
   */
  static async createBulkRawEvents(
    events: Array<CreateRawEventDTO & { userId: string }>,
  ): Promise<RawEventDTO[]> {
    if (events.length === 0) {
      return [];
    }

    const db = await getDb();

    const insertValues = events.map((event) => ({
      userId: event.userId,
      provider: event.provider,
      payload: event.payload,
      contactId: event.contactId ?? null,
      occurredAt: event.occurredAt,
      sourceMeta: event.sourceMeta ?? null,
      batchId: event.batchId ?? null,
      sourceId: event.sourceId ?? null,
    }));

    const newRawEvents = await db.insert(rawEvents).values(insertValues).returning({
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
    });

    return newRawEvents.map((event) => event);
  }

  /**
   * Get raw events for a user with optional filtering
   */
  static async listRawEvents(
    userId: string,
    filters?: RawEventFilters,
    limit: number = 100,
  ): Promise<RawEventDTO[]> {
    const db = await getDb();

    const conditions = [eq(rawEvents.userId, userId)];

    if (filters?.provider && filters.provider.length > 0) {
      conditions.push(inArray(rawEvents.provider, filters.provider));
    }

    if (filters?.contactId) {
      conditions.push(eq(rawEvents.contactId, filters.contactId));
    }

    if (filters?.batchId) {
      conditions.push(eq(rawEvents.batchId, filters.batchId));
    }

    if (filters?.sourceId) {
      conditions.push(eq(rawEvents.sourceId, filters.sourceId));
    }

    if (filters?.occurredAfter) {
      conditions.push(gte(rawEvents.occurredAt, filters.occurredAfter));
    }

    if (filters?.occurredBefore) {
      conditions.push(lte(rawEvents.occurredAt, filters.occurredBefore));
    }

    const rows = await db
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
      .where(and(...conditions))
      .orderBy(desc(rawEvents.occurredAt))
      .limit(limit);

    return rows.map((row) => row);
  }

  /**
   * List raw events with pagination and advanced filtering (matches server version API)
   */
  static async listRawEventsPaginated(
    userId: string,
    params: RawEventListParams,
  ): Promise<DbResult<{ items: RawEventListItem[]; total: number }>> {
    try {
      const db = await getDb();

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
        db
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
        db
          .select({ n: sql<number>`count(*)` })
          .from(rawEvents)
          .where(whereExpr)
          .limit(1),
      ]);

      return ok({
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
      });
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to list raw events",
        details: error,
      });
    }
  }

  /**
   * Get a single raw event by ID
   */
  static async getRawEventById(userId: string, eventId: string): Promise<RawEventDTO | null> {
    const db = await getDb();

    const rows = await db
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
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.id, eventId)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0]!;
  }

  /**
   * Count raw events for a user with optional filtering
   */
  static async countRawEvents(userId: string, filters?: RawEventFilters): Promise<number> {
    const db = await getDb();

    const conditions = [eq(rawEvents.userId, userId)];

    if (filters?.provider && filters.provider.length > 0) {
      conditions.push(inArray(rawEvents.provider, filters.provider));
    }

    if (filters?.contactId) {
      conditions.push(eq(rawEvents.contactId, filters.contactId));
    }

    if (filters?.batchId) {
      conditions.push(eq(rawEvents.batchId, filters.batchId));
    }

    if (filters?.sourceId) {
      conditions.push(eq(rawEvents.sourceId, filters.sourceId));
    }

    const result = await db
      .select({ count: count() })
      .from(rawEvents)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  /**
   * Delete raw events by batch ID
   */
  static async deleteRawEventsByBatch(userId: string, batchId: string): Promise<number> {
    const db = await getDb();

    const result = await db
      .delete(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.batchId, batchId)));

    return result.length;
  }

  /**
   * Create a raw event error
   */
  static async createRawEventError(
    data: CreateRawEventErrorDTO & { userId: string },
  ): Promise<RawEventErrorDTO> {
    const db = await getDb();

    const insertValues = {
      rawEventId: data.rawEventId ?? null,
      userId: data.userId,
      provider: data.provider,
      errorAt: new Date(),
      stage: data.stage,
      error: data.error,
      context: data.context ?? null,
    };

    const [newError] = await db.insert(rawEventErrors).values(insertValues).returning({
      id: rawEventErrors.id,
      rawEventId: rawEventErrors.rawEventId,
      userId: rawEventErrors.userId,
      provider: rawEventErrors.provider,
      errorAt: rawEventErrors.errorAt,
      stage: rawEventErrors.stage,
      error: rawEventErrors.error,
      context: rawEventErrors.context,
    });

    if (!newError) {
      throw new Error("Failed to create raw event error");
    }

    return newError;
  }

  /**
   * Get raw event errors for a user
   */
  static async listRawEventErrors(userId: string, limit: number = 50): Promise<RawEventErrorDTO[]> {
    const db = await getDb();

    const rows = await db
      .select({
        id: rawEventErrors.id,
        rawEventId: rawEventErrors.rawEventId,
        userId: rawEventErrors.userId,
        provider: rawEventErrors.provider,
        errorAt: rawEventErrors.errorAt,
        stage: rawEventErrors.stage,
        error: rawEventErrors.error,
        context: rawEventErrors.context,
      })
      .from(rawEventErrors)
      .where(eq(rawEventErrors.userId, userId))
      .orderBy(desc(rawEventErrors.errorAt))
      .limit(limit);

    return rows.map((row) => row);
  }

  /**
   * Check if raw event exists by source ID and provider
   */
  static async findRawEventBySourceId(
    userId: string,
    provider: string,
    sourceId: string,
  ): Promise<RawEventDTO | null> {
    const db = await getDb();

    const rows = await db
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
      .where(
        and(
          eq(rawEvents.userId, userId),
          eq(rawEvents.provider, provider),
          eq(rawEvents.sourceId, sourceId),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0]!;
  }

  /**
   * Get events by batch ID
   */
  static async getRawEventsByBatch(userId: string, batchId: string): Promise<RawEventDTO[]> {
    const db = await getDb();

    const rows = await db
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
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.batchId, batchId)))
      .orderBy(desc(rawEvents.occurredAt));

    return rows.map((row) => row);
  }
}

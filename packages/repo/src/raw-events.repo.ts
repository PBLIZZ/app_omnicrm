import { eq, and, desc, inArray, count } from "drizzle-orm";
import { rawEvents, rawEventErrors } from "./schema";
import { getDb } from "./db";
import type {
  RawEventDTO,
  CreateRawEventDTO,
  RawEventErrorDTO,
  CreateRawEventErrorDTO,
  RawEventFilters,
} from "@omnicrm/contracts";
import { RawEventDTOSchema, RawEventErrorDTOSchema } from "@omnicrm/contracts";

export class RawEventsRepository {
  /**
   * Create a new raw event
   */
  static async createRawEvent(data: CreateRawEventDTO & { userId: string }): Promise<RawEventDTO> {
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

    const [newRawEvent] = await db
      .insert(rawEvents)
      .values(insertValues)
      .returning({
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

    return RawEventDTOSchema.parse(newRawEvent);
  }

  /**
   * Bulk create raw events for batch ingestion
   */
  static async createBulkRawEvents(
    events: Array<CreateRawEventDTO & { userId: string }>
  ): Promise<RawEventDTO[]> {
    if (events.length === 0) {
      return [];
    }

    const db = await getDb();

    const insertValues = events.map(event => ({
      userId: event.userId,
      provider: event.provider,
      payload: event.payload,
      contactId: event.contactId ?? null,
      occurredAt: event.occurredAt,
      sourceMeta: event.sourceMeta ?? null,
      batchId: event.batchId ?? null,
      sourceId: event.sourceId ?? null,
    }));

    const newRawEvents = await db
      .insert(rawEvents)
      .values(insertValues)
      .returning({
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

    return newRawEvents.map(event => RawEventDTOSchema.parse(event));
  }

  /**
   * Get raw events for a user with optional filtering
   */
  static async listRawEvents(
    userId: string,
    filters?: RawEventFilters,
    limit: number = 100
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

    return rows.map(row => RawEventDTOSchema.parse(row));
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

    return RawEventDTOSchema.parse(rows[0]);
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
    data: CreateRawEventErrorDTO & { userId: string }
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

    const [newError] = await db
      .insert(rawEventErrors)
      .values(insertValues)
      .returning({
        id: rawEventErrors.id,
        rawEventId: rawEventErrors.rawEventId,
        userId: rawEventErrors.userId,
        provider: rawEventErrors.provider,
        errorAt: rawEventErrors.errorAt,
        stage: rawEventErrors.stage,
        error: rawEventErrors.error,
        context: rawEventErrors.context,
      });

    return RawEventErrorDTOSchema.parse(newError);
  }

  /**
   * Get raw event errors for a user
   */
  static async listRawEventErrors(
    userId: string,
    limit: number = 50
  ): Promise<RawEventErrorDTO[]> {
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

    return rows.map(row => RawEventErrorDTOSchema.parse(row));
  }

  /**
   * Check if raw event exists by source ID and provider
   */
  static async findRawEventBySourceId(
    userId: string,
    provider: string,
    sourceId: string
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
          eq(rawEvents.sourceId, sourceId)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return RawEventDTOSchema.parse(rows[0]);
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

    return rows.map(row => RawEventDTOSchema.parse(row));
  }
}
import { eq, and, desc, gte, lte, inArray } from "drizzle-orm";
import { interactions } from "./schema";
import { getDb } from "./db";
import type {
  InteractionDTO,
  CreateInteractionDTO,
  UpdateInteractionDTO,
  InteractionFilters
} from "@omnicrm/contracts";
import { InteractionDTOSchema } from "@omnicrm/contracts";

export class InteractionsRepository {
  /**
   * List interactions for a user with optional filtering
   */
  static async listInteractions(
    userId: string,
    filters?: InteractionFilters
  ): Promise<InteractionDTO[]> {
    const db = await getDb();

    // Build conditions array
    const conditions = [eq(interactions.userId, userId)];

    if (filters?.contactId) {
      conditions.push(eq(interactions.contactId, filters.contactId));
    }

    if (filters?.type && filters.type.length > 0) {
      conditions.push(inArray(interactions.type, filters.type));
    }

    if (filters?.source && filters.source.length > 0) {
      conditions.push(inArray(interactions.source, filters.source));
    }

    if (filters?.occurredAfter) {
      conditions.push(gte(interactions.occurredAt, filters.occurredAfter));
    }

    if (filters?.occurredBefore) {
      conditions.push(lte(interactions.occurredAt, filters.occurredBefore));
    }

    const query = db
      .select({
        id: interactions.id,
        userId: interactions.userId,
        contactId: interactions.contactId,
        type: interactions.type,
        subject: interactions.subject,
        bodyText: interactions.bodyText,
        bodyRaw: interactions.bodyRaw,
        occurredAt: interactions.occurredAt,
        source: interactions.source,
        sourceId: interactions.sourceId,
        sourceMeta: interactions.sourceMeta,
        batchId: interactions.batchId,
        createdAt: interactions.createdAt,
      })
      .from(interactions)
      .where(and(...conditions))
      .orderBy(desc(interactions.occurredAt));

    const rows = await query;

    // Validate and transform DB rows to DTOs
    return rows.map(row => InteractionDTOSchema.parse(row));
  }

  /**
   * Get a single interaction by ID
   */
  static async getInteractionById(userId: string, interactionId: string): Promise<InteractionDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: interactions.id,
        userId: interactions.userId,
        contactId: interactions.contactId,
        type: interactions.type,
        subject: interactions.subject,
        bodyText: interactions.bodyText,
        bodyRaw: interactions.bodyRaw,
        occurredAt: interactions.occurredAt,
        source: interactions.source,
        sourceId: interactions.sourceId,
        sourceMeta: interactions.sourceMeta,
        batchId: interactions.batchId,
        createdAt: interactions.createdAt,
      })
      .from(interactions)
      .where(and(eq(interactions.userId, userId), eq(interactions.id, interactionId)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return InteractionDTOSchema.parse(rows[0]);
  }

  /**
   * Get interactions for a specific contact
   */
  static async getInteractionsByContactId(
    userId: string,
    contactId: string
  ): Promise<InteractionDTO[]> {
    const db = await getDb();

    const rows = await db
      .select({
        id: interactions.id,
        userId: interactions.userId,
        contactId: interactions.contactId,
        type: interactions.type,
        subject: interactions.subject,
        bodyText: interactions.bodyText,
        bodyRaw: interactions.bodyRaw,
        occurredAt: interactions.occurredAt,
        source: interactions.source,
        sourceId: interactions.sourceId,
        sourceMeta: interactions.sourceMeta,
        batchId: interactions.batchId,
        createdAt: interactions.createdAt,
      })
      .from(interactions)
      .where(and(eq(interactions.userId, userId), eq(interactions.contactId, contactId)))
      .orderBy(desc(interactions.occurredAt));

    return rows.map(row => InteractionDTOSchema.parse(row));
  }

  /**
   * Create a new interaction
   */
  static async createInteraction(userId: string, data: CreateInteractionDTO): Promise<InteractionDTO> {
    const db = await getDb();

    // Convert undefined to null for database nullable fields with exactOptionalPropertyTypes
    const insertValues = {
      userId: userId,
      contactId: data.contactId ?? null,
      type: data.type,
      subject: data.subject ?? null,
      bodyText: data.bodyText ?? null,
      bodyRaw: data.bodyRaw ?? null,
      occurredAt: data.occurredAt,
      source: data.source ?? null,
      sourceId: data.sourceId ?? null,
      sourceMeta: data.sourceMeta ?? null,
      batchId: data.batchId ?? null,
    };

    const [newInteraction] = await db
      .insert(interactions)
      .values(insertValues)
      .returning({
        id: interactions.id,
        userId: interactions.userId,
        contactId: interactions.contactId,
        type: interactions.type,
        subject: interactions.subject,
        bodyText: interactions.bodyText,
        bodyRaw: interactions.bodyRaw,
        occurredAt: interactions.occurredAt,
        source: interactions.source,
        sourceId: interactions.sourceId,
        sourceMeta: interactions.sourceMeta,
        batchId: interactions.batchId,
        createdAt: interactions.createdAt,
      });

    return InteractionDTOSchema.parse(newInteraction);
  }

  /**
   * Update an existing interaction
   */
  static async updateInteraction(
    userId: string,
    interactionId: string,
    data: UpdateInteractionDTO
  ): Promise<InteractionDTO | null> {
    const db = await getDb();

    // Convert undefined to null for database nullable fields with exactOptionalPropertyTypes
    const updateValues = {
      ...(data.contactId !== undefined && { contactId: data.contactId ?? null }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.subject !== undefined && { subject: data.subject ?? null }),
      ...(data.bodyText !== undefined && { bodyText: data.bodyText ?? null }),
      ...(data.bodyRaw !== undefined && { bodyRaw: data.bodyRaw ?? null }),
      ...(data.occurredAt !== undefined && { occurredAt: data.occurredAt }),
      ...(data.source !== undefined && { source: data.source ?? null }),
      ...(data.sourceId !== undefined && { sourceId: data.sourceId ?? null }),
      ...(data.sourceMeta !== undefined && { sourceMeta: data.sourceMeta ?? null }),
      ...(data.batchId !== undefined && { batchId: data.batchId ?? null }),
    };

    const [updatedInteraction] = await db
      .update(interactions)
      .set(updateValues)
      .where(and(eq(interactions.userId, userId), eq(interactions.id, interactionId)))
      .returning({
        id: interactions.id,
        userId: interactions.userId,
        contactId: interactions.contactId,
        type: interactions.type,
        subject: interactions.subject,
        bodyText: interactions.bodyText,
        bodyRaw: interactions.bodyRaw,
        occurredAt: interactions.occurredAt,
        source: interactions.source,
        sourceId: interactions.sourceId,
        sourceMeta: interactions.sourceMeta,
        batchId: interactions.batchId,
        createdAt: interactions.createdAt,
      });

    if (!updatedInteraction) {
      return null;
    }

    return InteractionDTOSchema.parse(updatedInteraction);
  }

  /**
   * Delete an interaction
   */
  static async deleteInteraction(userId: string, interactionId: string): Promise<boolean> {
    const db = await getDb();

    const result = await db
      .delete(interactions)
      .where(and(eq(interactions.userId, userId), eq(interactions.id, interactionId)));

    return result.length > 0;
  }

  /**
   * Bulk create interactions (useful for sync operations)
   */
  static async bulkCreateInteractions(userId: string, data: CreateInteractionDTO[]): Promise<InteractionDTO[]> {
    const db = await getDb();

    const newInteractions = await db
      .insert(interactions)
      .values(data.map(item => ({
        userId: userId,
        contactId: item.contactId ?? null,
        type: item.type,
        subject: item.subject ?? null,
        bodyText: item.bodyText ?? null,
        bodyRaw: item.bodyRaw ?? null,
        occurredAt: item.occurredAt,
        source: item.source ?? null,
        sourceId: item.sourceId ?? null,
        sourceMeta: item.sourceMeta ?? null,
        batchId: item.batchId ?? null,
      })))
      .returning({
        id: interactions.id,
        userId: interactions.userId,
        contactId: interactions.contactId,
        type: interactions.type,
        subject: interactions.subject,
        bodyText: interactions.bodyText,
        bodyRaw: interactions.bodyRaw,
        occurredAt: interactions.occurredAt,
        source: interactions.source,
        sourceId: interactions.sourceId,
        sourceMeta: interactions.sourceMeta,
        batchId: interactions.batchId,
        createdAt: interactions.createdAt,
      });

    return newInteractions.map(row => InteractionDTOSchema.parse(row));
  }
}
import { eq, and, desc, gte, lte, inArray, count, sql } from "drizzle-orm";
import { interactions } from "./schema";
import { getDb } from "./db";
import type { Interaction, CreateInteraction } from "./schema";

// Local type aliases for repository layer
type InteractionDTO = Interaction;
type CreateInteractionDTO = CreateInteraction;
type UpdateInteractionDTO = Partial<CreateInteraction>;

interface InteractionFilters {
  contactId?: string;
  type?: string[];
  source?: string[];
  occurredAfter?: Date;
  occurredBefore?: Date;
}

// Additional types for server compatibility
interface IdRow {
  id: string;
}

interface EmbeddingRow {
  id: string;
  bodyText: string | null;
}

interface TypeStatsRow {
  type: string;
  count: string;
}

interface LinkStatsRow {
  linked: string;
  unlinked: string;
}

interface SourceStatsRow {
  source: string;
  count: string;
}

export class InteractionsRepository {
  /**
   * List interactions for a user with optional filtering
   */
  static async listInteractions(
    userId: string,
    filters?: InteractionFilters,
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

    return rows.map((row) => row);
  }

  /**
   * Get a single interaction by ID
   */
  static async getInteractionById(
    userId: string,
    interactionId: string,
  ): Promise<InteractionDTO | null> {
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

    return rows[0]!;
  }

  /**
   * Get interactions for a specific contact
   */
  static async getInteractionsByContactId(
    userId: string,
    contactId: string,
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

    return rows.map((row) => row);
  }

  /**
   * Create a new interaction
   */
  static async createInteraction(
    userId: string,
    data: CreateInteractionDTO,
  ): Promise<InteractionDTO> {
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

    const [newInteraction] = await db.insert(interactions).values(insertValues).returning({
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

    if (!newInteraction) {
      throw new Error("Failed to create interaction");
    }

    return newInteraction;
  }

  /**
   * Update an existing interaction
   */
  static async updateInteraction(
    userId: string,
    interactionId: string,
    data: UpdateInteractionDTO,
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

    return updatedInteraction;
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
  static async bulkCreateInteractions(
    userId: string,
    data: CreateInteractionDTO[],
  ): Promise<InteractionDTO[]> {
    const db = await getDb();

    const newInteractions = await db
      .insert(interactions)
      .values(
        data.map((item) => ({
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
        })),
      )
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

    return newInteractions.map((row) => row);
  }

  /**
   * Count interactions for a user
   */
  static async countInteractions(userId: string, filters?: InteractionFilters): Promise<number> {
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

    const result = await db
      .select({ count: count() })
      .from(interactions)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  /**
   * Upsert interaction with idempotency on (user_id, source, source_id)
   */
  static async upsert(
    interaction: CreateInteractionDTO & { userId: string },
  ): Promise<string | null> {
    const db = await getDb();

    const result = await db.execute(sql`
      INSERT INTO interactions (
        user_id, contact_id, type, subject, body_text, body_raw,
        occurred_at, source, source_id, source_meta, batch_id, created_at
      ) VALUES (
        ${interaction.userId}, ${interaction.contactId}, ${interaction.type},
        ${interaction.subject}, ${interaction.bodyText}, ${JSON.stringify(interaction.bodyRaw)},
        ${interaction.occurredAt}, ${interaction.source}, ${interaction.sourceId},
        ${JSON.stringify(interaction.sourceMeta)}, ${interaction.batchId},
        ${new Date().toISOString()}
      )
      ON CONFLICT (user_id, source, source_id) 
      DO UPDATE SET
        contact_id = EXCLUDED.contact_id,
        type = EXCLUDED.type,
        subject = EXCLUDED.subject,
        body_text = EXCLUDED.body_text,
        body_raw = EXCLUDED.body_raw,
        occurred_at = EXCLUDED.occurred_at,
        source_meta = EXCLUDED.source_meta,
        batch_id = EXCLUDED.batch_id
      RETURNING id
    `);

    return result.length > 0 ? (result[0] as unknown as IdRow).id : null;
  }

  /**
   * Bulk upsert interactions
   */
  static async bulkUpsert(
    interactions: Array<CreateInteractionDTO & { userId: string }>,
  ): Promise<string[]> {
    const insertedIds: string[] = [];

    for (const interaction of interactions) {
      const id = await this.upsert(interaction);
      if (id) insertedIds.push(id);
    }

    return insertedIds;
  }

  /**
   * Get unlinked interactions (no contact_id)
   */
  static async getUnlinked(
    userId: string,
    options: {
      limit?: number;
      sources?: string[];
      daysSince?: number;
    } = {},
  ): Promise<InteractionDTO[]> {
    const db = await getDb();

    const daysSince = options.daysSince ?? 7;

    const result = await db.execute(sql`
      SELECT 
        id,
        user_id AS "userId",
        contact_id AS "contactId",
        type,
        subject,
        body_text AS "bodyText",
        body_raw AS "bodyRaw",
        occurred_at AS "occurredAt",
        source,
        source_id AS "sourceId",
        source_meta AS "sourceMeta",
        batch_id AS "batchId",
        created_at AS "createdAt"
      FROM interactions
      WHERE user_id = ${userId}
        AND contact_id IS NULL
        AND created_at > now() - (${daysSince} * interval '1 day')
        ${options.sources?.length ? sql`AND source = ANY(${options.sources})` : sql``}
      ORDER BY created_at DESC
      LIMIT ${options.limit ?? 100}
    `);

    return result as unknown as InteractionDTO[];
  }

  /**
   * Link interaction to contact
   */
  static async linkToContact(interactionId: string, contactId: string): Promise<void> {
    const db = await getDb();

    await db.execute(sql`
      UPDATE interactions
      SET contact_id = ${contactId}
      WHERE id = ${interactionId}
    `);
  }

  /**
   * Get recent interactions for timeline
   */
  static async getRecentForTimeline(
    userId: string,
    options: {
      limit?: number;
      hoursBack?: number;
      hasContact?: boolean;
    } = {},
  ): Promise<InteractionDTO[]> {
    const db = await getDb();

    const hoursBack = options.hoursBack ?? 24;

    const result = await db.execute(sql`
      SELECT 
        id,
        user_id AS "userId",
        contact_id AS "contactId",
        type,
        subject,
        body_text AS "bodyText",
        body_raw AS "bodyRaw",
        occurred_at AS "occurredAt",
        source,
        source_id AS "sourceId",
        source_meta AS "sourceMeta",
        batch_id AS "batchId",
        created_at AS "createdAt"
      FROM interactions
      WHERE user_id = ${userId}
        AND created_at > now() - (INTERVAL '1 hour' * ${hoursBack})
        ${
          options.hasContact !== undefined
            ? options.hasContact
              ? sql`AND contact_id IS NOT NULL`
              : sql`AND contact_id IS NULL`
            : sql``
        }
      ORDER BY occurred_at DESC
      LIMIT ${options.limit ?? 100}
    `);

    return result as unknown as InteractionDTO[];
  }

  /**
   * Get interactions without embeddings
   */
  static async getWithoutEmbeddings(
    userId: string,
    limit = 50,
  ): Promise<Array<{ id: string; bodyText: string | null }>> {
    const db = await getDb();

    const result = await db.execute(sql`
      SELECT i.id, i.body_text AS "bodyText"
      FROM interactions i
      LEFT JOIN embeddings e ON e.owner_type = 'interaction' AND e.owner_id = i.id
      WHERE i.user_id = ${userId}
        AND i.body_text IS NOT NULL
        AND i.body_text != ''
        AND e.id IS NULL
      ORDER BY i.created_at DESC
      LIMIT ${limit}
    `);

    return (result as unknown as EmbeddingRow[]).map((row) => ({
      id: row.id,
      bodyText: row.bodyText,
    }));
  }

  /**
   * Get interaction statistics
   */
  static async getStats(userId: string): Promise<{
    byType: Record<string, number>;
    linking: { linked: number; unlinked: number };
    bySource: Record<string, number>;
  }> {
    const db = await getDb();

    // Get counts by type
    const typeStats = await db.execute(sql`
      SELECT type, count(*) as count
      FROM interactions
      WHERE user_id = ${userId}
        AND created_at > now() - interval '30 days'
      GROUP BY type
      ORDER BY count DESC
    `);

    // Get linked vs unlinked counts
    const linkStats = await db.execute(sql`
      SELECT 
        count(*) FILTER (WHERE contact_id IS NOT NULL) as linked,
        count(*) FILTER (WHERE contact_id IS NULL) as unlinked
      FROM interactions
      WHERE user_id = ${userId}
        AND created_at > now() - interval '30 days'
    `);

    // Get source distribution
    const sourceStats = await db.execute(sql`
      SELECT source, count(*) as count
      FROM interactions
      WHERE user_id = ${userId}
        AND created_at > now() - interval '30 days'
      GROUP BY source
      ORDER BY count DESC
    `);

    return {
      byType: (typeStats as unknown as TypeStatsRow[]).reduce(
        (acc: Record<string, number>, row: TypeStatsRow) => {
          acc[row.type] = parseInt(row.count, 10);
          return acc;
        },
        {},
      ),
      linking: {
        linked: parseInt((linkStats[0] as unknown as LinkStatsRow)?.linked ?? "0", 10),
        unlinked: parseInt((linkStats[0] as unknown as LinkStatsRow)?.unlinked ?? "0", 10),
      },
      bySource: (sourceStats as unknown as SourceStatsRow[]).reduce(
        (acc: Record<string, number>, row: SourceStatsRow) => {
          acc[row.source] = parseInt(row.count, 10);
          return acc;
        },
        {},
      ),
    };
  }
}

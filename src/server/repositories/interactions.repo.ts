import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { NewInteraction } from "@/lib/schemas/interactions.dto";

// Database row types for query results
interface InteractionRow {
  id: string;
  user_id: string;
  contact_id: string | null;
  type: string;
  subject: string | null;
  body_text: string | null;
  body_raw: unknown;
  occurred_at: string;
  source: string | null;
  source_id: string | null;
  source_meta: unknown;
  batch_id: string | null;
  created_at: string;
}

interface IdRow {
  id: string;
}

interface EmbeddingRow {
  id: string;
  body_text: string | null;
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
   * Upsert interaction with idempotency on (user_id, source, source_id)
   */
  async upsert(interaction: NewInteraction): Promise<string | null> {
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

    return result.length > 0 ? (result[0] as IdRow).id : null;
  }

  /**
   * Bulk upsert interactions
   */
  async bulkUpsert(interactions: NewInteraction[]): Promise<string[]> {
    const insertedIds: string[] = [];

    for (const interaction of interactions) {
      const id = await this.upsert(interaction);
      if (id) insertedIds.push(id);
    }

    return insertedIds;
  }

  /**
   * Get interaction by ID
   */
  async getById(interactionId: string): Promise<InteractionRow | null> {
    const db = await getDb();

    const result = await db.execute(sql`
      SELECT * FROM interactions
      WHERE id = ${interactionId}
      LIMIT 1
    `);

    return result.length > 0 ? (result[0] as InteractionRow) : null;
  }

  /**
   * Get interactions for contact
   */
  async getByContact(
    userId: string,
    contactId: string,
    options: {
      limit?: number;
      offset?: number;
      types?: string[];
    } = {},
  ): Promise<InteractionRow[]> {
    const db = await getDb();

    const result = await db.execute(sql`
      SELECT * FROM interactions
      WHERE user_id = ${userId} AND contact_id = ${contactId}
        ${options.types?.length ? sql`AND type = ANY(${options.types})` : sql``}
      ORDER BY occurred_at DESC
      LIMIT ${options.limit ?? 50}
      OFFSET ${options.offset ?? 0}
    `);

    return result as InteractionRow[];
  }

  /**
   * Get unlinked interactions (no contact_id)
   */
  async getUnlinked(
    userId: string,
    options: {
      limit?: number;
      sources?: string[];
      daysSince?: number;
    } = {},
  ): Promise<InteractionRow[]> {
    const db = await getDb();

    const daysSince = options.daysSince ?? 7;

    const result = await db.execute(sql`
      SELECT * FROM interactions
      WHERE user_id = ${userId}
        AND contact_id IS NULL
        AND created_at > now() - interval '${daysSince} days'
        ${options.sources?.length ? sql`AND source = ANY(${options.sources})` : sql``}
      ORDER BY created_at DESC
      LIMIT ${options.limit ?? 100}
    `);

    return result as InteractionRow[];
  }

  /**
   * Link interaction to contact
   */
  async linkToContact(interactionId: string, contactId: string): Promise<void> {
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
  async getRecentForTimeline(
    userId: string,
    options: {
      limit?: number;
      hoursBack?: number;
      hasContact?: boolean;
    } = {},
  ): Promise<InteractionRow[]> {
    const db = await getDb();

    const hoursBack = options.hoursBack ?? 24;

    const result = await db.execute(sql`
      SELECT * FROM interactions
      WHERE user_id = ${userId}
        AND created_at > now() - interval '${hoursBack} hours'
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

    return result as InteractionRow[];
  }

  /**
   * Get interactions without embeddings
   */
  async getWithoutEmbeddings(
    userId: string,
    limit = 50,
  ): Promise<Array<{ id: string; bodyText: string | null }>> {
    const db = await getDb();

    const result = await db.execute(sql`
      SELECT i.id, i.body_text
      FROM interactions i
      LEFT JOIN embeddings e ON e.owner_type = 'interaction' AND e.owner_id = i.id
      WHERE i.user_id = ${userId}
        AND i.body_text IS NOT NULL
        AND i.body_text != ''
        AND e.id IS NULL
      ORDER BY i.created_at DESC
      LIMIT ${limit}
    `);

    return (result as EmbeddingRow[]).map((row) => ({
      id: row.id,
      bodyText: row.body_text,
    }));
  }

  /**
   * Get interaction statistics
   */
  async getStats(userId: string): Promise<{
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
      byType: (typeStats as TypeStatsRow[]).reduce(
        (acc: Record<string, number>, row: TypeStatsRow) => {
          acc[row.type] = parseInt(row.count, 10);
          return acc;
        },
        {},
      ),
      linking: {
        linked: parseInt((linkStats[0] as LinkStatsRow)?.linked || "0", 10),
        unlinked: parseInt((linkStats[0] as LinkStatsRow)?.unlinked || "0", 10),
      },
      bySource: (sourceStats as SourceStatsRow[]).reduce(
        (acc: Record<string, number>, row: SourceStatsRow) => {
          acc[row.source] = parseInt(row.count, 10);
          return acc;
        },
        {},
      ),
    };
  }
}

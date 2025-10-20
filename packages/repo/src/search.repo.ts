import { eq, and, ilike, or } from "drizzle-orm";
import { contacts, notes, interactions, tasks, embeddings } from "@/server/db/schema";
import { DbClient } from "@/server/db/client";

export interface SearchResultDTO {
  id: string;
  type: "contact" | "note" | "interaction" | "calendar_event" | "task";
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity?: number;
  score?: number;
  source?: "traditional" | "semantic" | "hybrid";
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface TraditionalSearchParams {
  userId: string;
  query: string;
  limit: number;
  types?: Array<"contact" | "note" | "interaction" | "calendar_event" | "task">;
}

export interface SemanticSearchParams {
  userId: string;
  embedding: number[];
  limit: number;
  similarityThreshold?: number;
  types?: Array<"contact" | "note" | "interaction" | "calendar_event" | "task">;
}

export class SearchRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Perform traditional text-based search across multiple entity types
   */
  async searchTraditional(params: TraditionalSearchParams): Promise<SearchResultDTO[]> {
    const { userId, query, limit, types } = params;
    const searchTerm = `%${query}%`;
    const results: SearchResultDTO[] = [];

    // Calculate limit per type - distribute evenly
    const enabledTypes = types || ["contact", "note", "interaction", "calendar_event", "task"];
    const limitPerType = Math.max(1, Math.ceil(limit / enabledTypes.length));

    // Search contacts
    if (enabledTypes.includes("contact")) {
      const contactRows = await this.db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, userId),
            or(
              ilike(contacts.displayName, searchTerm),
              ilike(contacts.primaryEmail, searchTerm),
              ilike(contacts.primaryPhone, searchTerm),
            ),
          ),
        )
        .limit(limitPerType);

      for (const row of contactRows) {
        results.push({
          id: row.id,
          type: "contact",
          title: row.displayName,
          content: "", // Let service layer format content from metadata
          metadata: {
            email: row.primaryEmail,
            phone: row.primaryPhone,
            lifecycleStage: row.lifecycleStage,
            tags: row.tags,
          },
          score: 1,
          source: "traditional",
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      }
    }

    // Search notes
    if (enabledTypes.includes("note")) {
      const noteRows = await this.db
        .select({
          note: notes,
          contact: contacts,
        })
        .from(notes)
        .leftJoin(contacts, eq(notes.contactId, contacts.id))
        .where(and(eq(notes.userId, userId), ilike(notes.contentPlain, searchTerm)))
        .limit(limitPerType);

      for (const row of noteRows) {
        results.push({
          id: row.note.id,
          type: "note",
          title:
            row.note.contentPlain.slice(0, 50) + (row.note.contentPlain.length > 50 ? "..." : ""),
          content: row.note.contentPlain,
          metadata: {
            contactId: row.note.contactId,
            contactName: row.contact?.displayName,
            tags: row.note.tags,
            sourceType: row.note.sourceType,
          },
          score: 1,
          source: "traditional",
          createdAt: row.note.createdAt,
          updatedAt: row.note.updatedAt,
        });
      }
    }

    // Search interactions
    if (enabledTypes.includes("interaction")) {
      const interactionRows = await this.db
        .select({
          interaction: interactions,
          contact: contacts,
        })
        .from(interactions)
        .leftJoin(contacts, eq(interactions.contactId, contacts.id))
        .where(
          and(
            eq(interactions.userId, userId),
            or(ilike(interactions.subject, searchTerm), ilike(interactions.bodyText, searchTerm)),
          ),
        )
        .limit(limitPerType);

      for (const row of interactionRows) {
        results.push({
          id: row.interaction.id,
          type: "interaction",
          title: row.interaction.subject || `${row.interaction.type} interaction`,
          content: row.interaction.bodyText || "",
          metadata: {
            type: row.interaction.type,
            contactId: row.interaction.contactId,
            contactName: row.contact?.displayName,
            occurredAt: row.interaction.occurredAt,
            source: row.interaction.source,
          },
          score: 1,
          source: "traditional",
          createdAt: row.interaction.createdAt,
        });
      }
    }

    // Search calendar events - DISABLED: calendar_events table removed
    // Calendar data is now in raw_events with provider='calendar'
    // TODO: Implement calendar search via raw_events/interactions when needed
    if (enabledTypes.includes("calendar_event")) {
      // Placeholder - calendar events search not yet implemented for new architecture
    }

    // Search tasks
    if (enabledTypes.includes("task")) {
      const taskRows = await this.db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), or(ilike(tasks.name, searchTerm))))
        .limit(limitPerType);

      for (const row of taskRows) {
        const taskId: string = String(row.id);
        const taskName: string = String(row.name);
        const taskStatus = row.status as string;
        const taskPriority = row.priority as string;
        const taskDueDate = row.dueDate as string | null;
        const taskProjectId = row.projectId as string | null;
        const taskCreatedAt = row.createdAt as Date;
        const taskUpdatedAt = row.updatedAt as Date;

        results.push({
          id: taskId,
          type: "task",
          title: taskName,
          content: JSON.stringify(row.details || {}),
          metadata: {
            status: taskStatus,
            priority: taskPriority,
            dueDate: taskDueDate,
            projectId: taskProjectId,
          },
          score: 1,
          source: "traditional",
          createdAt: taskCreatedAt,
          updatedAt: taskUpdatedAt,
        });
      }
    }

    // Sort by creation date (most recent first) and limit
    const sortedResults = results
      .sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, limit);

    return sortedResults;
  }

  /**
   * Perform semantic search using embeddings
   */
  async searchSemantic(params: SemanticSearchParams): Promise<SearchResultDTO[]> {
    const { userId, embedding, limit, similarityThreshold = 0.7 } = params;

    // Use the semantic_search RPC function if it exists
    // For now, let's implement a basic embeddings search
    const embeddingRows = await this.db
      .select()
      .from(embeddings)
      .where(eq(embeddings.userId, userId))
      .limit(limit * 2); // Get more results to filter

    // Convert embedding string back to array and calculate similarity
    const results: SearchResultDTO[] = [];

    for (const row of embeddingRows) {
      if (!row.embedding) continue;

      // Skip if types filter is provided and this row's ownerType is not included
      if (
        params.types &&
        params.types.length > 0 &&
        !params.types.includes(
          row.ownerType as "contact" | "note" | "interaction" | "calendar_event" | "task",
        )
      ) {
        continue;
      }

      try {
        const rowEmbedding = JSON.parse(row.embedding) as number[];
        const similarity = calculateCosineSimilarity(embedding, rowEmbedding);

        if (similarity >= similarityThreshold) {
          // Get the actual entity based on ownerType and ownerId
          const entityData = await this.getEntityById(userId, row.ownerType, row.ownerId);

          if (entityData) {
            results.push({
              ...entityData,
              similarity,
              score: similarity,
              source: "semantic",
            });
          }
        }
      } catch (_error) {
        // Skip malformed embedding data
        continue;
      }
    }

    // Sort by similarity (highest first) and limit
    const sortedResults = results
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);

    return sortedResults;
  }

  /**
   * Get entity by type and ID for semantic search results
   */
  private async getEntityById(
    userId: string,
    ownerType: string,
    ownerId: string,
  ): Promise<SearchResultDTO | null> {
    switch (ownerType) {
      case "contact": {
        const [contact] = await this.db
          .select()
          .from(contacts)
          .where(and(eq(contacts.userId, userId), eq(contacts.id, ownerId)))
          .limit(1);

        if (!contact) return null;

        return {
          id: contact.id,
          type: "contact",
          title: contact.displayName,
          content: "", // Let service layer format content from metadata
          metadata: {
            email: contact.primaryEmail,
            phone: contact.primaryPhone,
            lifecycleStage: contact.lifecycleStage,
            tags: contact.tags,
          },
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
        };
      }

      case "note": {
        const noteRows = await this.db
          .select({
            note: notes,
            contact: contacts,
          })
          .from(notes)
          .leftJoin(contacts, eq(notes.contactId, contacts.id))
          .where(and(eq(notes.userId, userId), eq(notes.id, ownerId)))
          .limit(1);

        const row = noteRows[0];
        if (!row) return null;

        return {
          id: row.note.id,
          type: "note",
          title:
            row.note.contentPlain.slice(0, 50) + (row.note.contentPlain.length > 50 ? "..." : ""),
          content: row.note.contentPlain,
          metadata: {
            contactId: row.note.contactId,
            contactName: row.contact?.displayName,
            tags: row.note.tags,
            sourceType: row.note.sourceType,
          },
          createdAt: row.note.createdAt,
          updatedAt: row.note.updatedAt,
        };
      }

      case "interaction": {
        const interactionRows = await this.db
          .select({
            interaction: interactions,
            contact: contacts,
          })
          .from(interactions)
          .leftJoin(contacts, eq(interactions.contactId, contacts.id))
          .where(and(eq(interactions.userId, userId), eq(interactions.id, ownerId)))
          .limit(1);

        const row = interactionRows[0];
        if (!row) return null;

        return {
          id: row.interaction.id,
          type: "interaction",
          title: row.interaction.subject || `${row.interaction.type} interaction`,
          content: row.interaction.bodyText || "",
          metadata: {
            type: row.interaction.type,
            contactId: row.interaction.contactId,
            contactName: row.contact?.displayName,
            occurredAt: row.interaction.occurredAt,
            source: row.interaction.source,
          },
          createdAt: row.interaction.createdAt,
        };
      }

      case "calendar_event": {
        // Calendar events table removed - data is now in raw_events
        // TODO: Implement calendar event retrieval via raw_events/interactions
        return null;
      }

      case "task": {
        const [task] = await this.db
          .select()
          .from(tasks)
          .where(and(eq(tasks.userId, userId), eq(tasks.id, ownerId)))
          .limit(1);

        if (!task) return null;

        const taskId: string = String(task.id);
        const taskName: string = String(task.name);
        const taskStatus = task.status as string;
        const taskPriority = task.priority as string;
        const taskDueDate = task.dueDate as string | null;
        const taskProjectId = task.projectId as string | null;
        const taskCreatedAt = task.createdAt as Date;
        const taskUpdatedAt = task.updatedAt as Date;

        return {
          id: taskId,
          type: "task",
          title: taskName,
          content: JSON.stringify(task.details || {}),
          metadata: {
            status: taskStatus,
            priority: taskPriority,
            dueDate: taskDueDate,
            projectId: taskProjectId,
          },
          createdAt: taskCreatedAt,
          updatedAt: taskUpdatedAt,
        };
      }

      default:
        return null;
    }
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Factory function to create SearchRepository instance
 */
export function createSearchRepository(db: DbClient): SearchRepository {
  return new SearchRepository(db);
}

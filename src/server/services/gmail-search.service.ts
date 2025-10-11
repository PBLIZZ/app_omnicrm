/**
 * Gmail Search Service
 *
 * Provides AI-powered semantic search through Gmail data using vector embeddings
 */

import { getDb } from "@/server/db/client";
import { eq, and, desc, sql } from "drizzle-orm";
import { rawEvents, contacts } from "@/server/db/schema";

export interface SearchResult {
  subject: string;
  similarity: number;
  date: string;
  snippet: string;
  contactInfo?: {
    displayName: string;
  };
}

export interface SearchParams {
  query: string;
  limit: number;
}

interface GmailMessagePayload {
  message?: {
    subject?: string;
    snippet?: string;
    bodyText?: string;
  };
}

export class GmailSearchService {
  /**
   * Perform semantic search through Gmail messages
   */
  static async searchEmails(userId: string, params: SearchParams): Promise<SearchResult[]> {
    const { query, limit } = params;
    const db = await getDb();

    // For now, do a simple text-based search through Gmail raw events
    // In the future, this could be enhanced with vector similarity search
    const searchResults = await db
      .select({
        id: rawEvents.id,
        sourceId: rawEvents.sourceId,
        payload: rawEvents.payload,
        occurredAt: rawEvents.occurredAt,
        contactId: rawEvents.contactId,
      })
      .from(rawEvents)
      .where(
        and(
          eq(rawEvents.userId, userId),
          eq(rawEvents.provider, "gmail"),
          // Simple text search in JSON payload
          sql`${rawEvents.payload}::text ILIKE ${`%${query}%`}`
        )
      )
      .orderBy(desc(rawEvents.occurredAt))
      .limit(limit);

    // Get contact information for results with contactId
    const contactsMap = await this.getContactsMap(userId, searchResults);

    // Transform results to expected format
    return this.transformSearchResults(searchResults, contactsMap);
  }

  /**
   * Get contacts map for search results
   */
  private static async getContactsMap(
    userId: string,
    searchResults: Array<{ contactId: string | null }>
  ): Promise<Map<string, { id: string; displayName: string }>> {
    const contactIds = searchResults
      .map(r => r.contactId)
      .filter(Boolean) as string[];

    const contactsMap = new Map<string, { id: string; displayName: string }>();

    if (contactIds.length > 0) {
      const db = await getDb();
      const contactsData = await db
        .select({
          id: contacts.id,
          displayName: contacts.displayName,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, userId),
            sql`${contacts.id} = ANY(${contactIds})`
          )
        );

      contactsData.forEach(c => contactsMap.set(c.id, c));
    }

    return contactsMap;
  }

  /**
   * Transform raw search results to formatted SearchResult objects
   */
  private static transformSearchResults(
    searchResults: Array<{
      id: string;
      sourceId: string | null;
      payload: unknown;
      occurredAt: Date | null;
      contactId: string | null;
    }>,
    contactsMap: Map<string, { id: string; displayName: string }>
  ): SearchResult[] {
    return searchResults.map((result) => {
      const payload = result.payload as GmailMessagePayload;
      const message = payload?.message ?? {};

      const contact = result.contactId
        ? contactsMap.get(result.contactId)
        : undefined;

      return {
        subject: message.subject ?? "No Subject",
        similarity: 0.8, // Mock similarity score - replace with actual vector similarity when implemented
        date: result.occurredAt?.toISOString() ?? new Date().toISOString(),
        snippet: message.snippet ?? message.bodyText ?? "",
        ...(contact && {
          contactInfo: {
            displayName: contact.displayName,
          },
        }),
      };
    });
  }

  /**
   * Future enhancement: Perform vector similarity search
   * This would use embeddings table for semantic search
   */
  static async searchEmailsSemantics(userId: string, params: SearchParams): Promise<SearchResult[]> {
    // TODO: Implement vector similarity search when embeddings are ready
    // This would query the embeddings table and use cosine similarity
    // For now, fallback to text search
    return this.searchEmails(userId, params);
  }
}
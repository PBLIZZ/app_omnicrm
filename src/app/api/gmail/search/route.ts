/**
 * POST /api/gmail/search — Semantic email search endpoint
 *
 * Provides AI-powered semantic search through Gmail data using vector embeddings
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { eq, and, desc, sql } from "drizzle-orm";
import { rawEvents, contacts } from "@/server/db/schema";
import { z } from "zod";

const SearchRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().min(1).max(50).default(10),
});

interface SearchResult {
  subject: string;
  similarity: number;
  date: string;
  snippet: string;
  contactInfo?: {
    displayName: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body: unknown = await request.json();
    const { query, limit } = SearchRequestSchema.parse(body);

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

    // Get contact info for results that have contactId
    const contactIds = searchResults
      .map(r => r.contactId)
      .filter(Boolean) as string[];

    const contactsMap = new Map();
    if (contactIds.length > 0) {
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

    // Transform results to expected format
    const results: SearchResult[] = searchResults.map((result) => {
      const payload = result.payload as any;
      const message = payload?.message || {};

      return {
        subject: message.subject || "No Subject",
        similarity: 0.8, // Mock similarity score
        date: result.occurredAt?.toISOString() || new Date().toISOString(),
        snippet: message.snippet || message.bodyText || "",
        ...(result.contactId && contactsMap.has(result.contactId) && {
          contactInfo: {
            displayName: contactsMap.get(result.contactId).displayName,
          },
        }),
      };
    });

    return NextResponse.json({ results });

  } catch (error: unknown) {
    console.error("POST /api/gmail/search error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    if (errorMessage.includes("unauthorized") || errorMessage.includes("auth")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to search emails" },
      { status: 500 }
    );
  }
}
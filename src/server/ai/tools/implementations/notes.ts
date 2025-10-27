/**
 * Notes Domain Tools
 *
 * AI-callable tools for note operations in the wellness CRM.
 * CRITICAL CONSTRAINT: AI can ONLY read and analyze notes.
 * AI CANNOT create notes - only humans can create notes.
 */

import type { ToolDefinition, ToolHandler } from "../types";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { NotesRepository, TagsRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";
import type { Note } from "@/server/db/schema";

// ============================================================================
// TOOL: search_notes
// ============================================================================

const SearchNotesParamsSchema = z.object({
  query: z.string().optional(),
  contact_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).default(20),
});

type SearchNotesParams = z.infer<typeof SearchNotesParamsSchema>;

export const searchNotesDefinition: ToolDefinition = {
  name: "search_notes",
  category: "data_access",
  version: "1.0.0",
  description:
    "Search note content by keyword, contact, or date range. Returns matching notes with content, timestamps, and contact context.",
  useCases: [
    "When user asks 'find notes about anxiety'",
    "When user wants to 'show me all notes for Sarah'",
    "When user searches 'notes from last week'",
    "When preparing for a session and need recent notes",
  ],
  exampleCalls: [
    'search_notes({"query": "anxiety", "limit": 10})',
    'search_notes({"contact_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'When user says: "Find all notes about stress management"',
  ],
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search term to find in note content (optional)",
      },
      contact_id: {
        type: "string",
        description: "Filter notes for specific contact UUID (optional)",
      },
      start_date: {
        type: "string",
        description: "Filter notes created on or after this date (ISO 8601 format, optional)",
      },
      end_date: {
        type: "string",
        description: "Filter notes created on or before this date (ISO 8601 format, optional)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 20, max: 100)",
      },
    },
    required: [],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300,
  tags: ["notes", "read", "search"],
  deprecated: false,
};

export const searchNotesHandler: ToolHandler<SearchNotesParams> = async (params, context) => {
  const validated = SearchNotesParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = new NotesRepository(db);

    let notes: Note[];

    // If contact_id is provided, filter by contact
    if (validated.contact_id) {
      notes = await repo.getNotesByContactId(context.userId, validated.contact_id);
    } else if (validated.query) {
      // If query is provided, search by content
      notes = await repo.searchNotes(context.userId, validated.query);
    } else {
      // Otherwise list all notes for user
      notes = await repo.listNotes(context.userId);
    }

    // Apply date filtering if provided
    if (validated.start_date) {
      const startDate = new Date(validated.start_date);
      notes = notes.filter((note) => note.createdAt && note.createdAt >= startDate);
    }

    if (validated.end_date) {
      const endDate = new Date(validated.end_date);
      notes = notes.filter((note) => note.createdAt && note.createdAt <= endDate);
    }

    // Apply limit
    const limitedNotes: Note[] = notes.slice(0, validated.limit);

    return limitedNotes;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to search notes",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: get_note
// ============================================================================

const GetNoteParamsSchema = z.object({
  note_id: z.string().uuid(),
});

type GetNoteParams = z.infer<typeof GetNoteParamsSchema>;

export const getNoteDefinition: ToolDefinition = {
  name: "get_note",
  category: "data_access",
  version: "1.0.0",
  description:
    "Retrieve complete details for a specific note by ID. Returns note content (rich and plain), PII entities, source type, and timestamps.",
  useCases: [
    "When user asks 'show me note details for ID abc123'",
    "When reviewing a specific note from search results",
    "When analyzing a particular session note",
    "When verifying note content before analysis",
  ],
  exampleCalls: [
    'get_note({"note_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'When user says: "Show me the full note from yesterday\'s session"',
  ],
  parameters: {
    type: "object",
    properties: {
      note_id: {
        type: "string",
        description: "UUID of the note to retrieve",
      },
    },
    required: ["note_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300,
  tags: ["notes", "read"],
  deprecated: false,
};

export const getNoteHandler: ToolHandler<GetNoteParams> = async (params, context) => {
  const validated = GetNoteParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = new NotesRepository(db);

    const note: Note | null = await repo.getNoteById(context.userId, validated.note_id);

    if (!note) {
      throw new AppError(`Note with ID ${validated.note_id} not found`, "NOT_FOUND", "database", false, 404);
    }

    return note;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get note",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: analyze_note_sentiment
// ============================================================================

const AnalyzeNoteSentimentParamsSchema = z.object({
  note_id: z.string().uuid(),
});

type AnalyzeNoteSentimentParams = z.infer<typeof AnalyzeNoteSentimentParamsSchema>;

export const analyzeNoteSentimentDefinition: ToolDefinition = {
  name: "analyze_note_sentiment",
  category: "analytics",
  version: "1.0.0",
  description:
    "Analyze sentiment of a note's content. Returns sentiment classification (positive, neutral, negative) with confidence score based on keyword analysis.",
  useCases: [
    "When user asks 'what is the sentiment of this note?'",
    "When analyzing client progress through note tone",
    "When identifying concerning patterns in session notes",
    "When tracking emotional trajectory over time",
  ],
  exampleCalls: [
    'analyze_note_sentiment({"note_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'When user says: "Is this note positive or negative?"',
  ],
  parameters: {
    type: "object",
    properties: {
      note_id: {
        type: "string",
        description: "UUID of the note to analyze",
      },
    },
    required: ["note_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 600,
  tags: ["notes", "analytics", "sentiment"],
  deprecated: false,
};

export const analyzeNoteSentimentHandler: ToolHandler<AnalyzeNoteSentimentParams> = async (
  params,
  context,
) => {
  const validated = AnalyzeNoteSentimentParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = new NotesRepository(db);

    const note: Note | null = await repo.getNoteById(context.userId, validated.note_id);

    if (!note) {
      throw new AppError(`Note with ID ${validated.note_id} not found`, "NOT_FOUND", "database", false, 404);
    }

    // Simple keyword-based sentiment analysis
    const content: string = note.contentPlain.toLowerCase();

  // Sentiment keywords
  const positiveKeywords = [
    "happy",
    "great",
    "excellent",
    "wonderful",
    "amazing",
    "good",
    "better",
    "improved",
    "progress",
    "success",
    "positive",
    "grateful",
    "relieved",
    "calm",
    "peaceful",
    "energized",
    "motivated",
  ];

  const negativeKeywords = [
    "sad",
    "angry",
    "frustrated",
    "anxious",
    "worried",
    "stressed",
    "pain",
    "hurt",
    "difficult",
    "struggle",
    "worse",
    "bad",
    "terrible",
    "awful",
    "depressed",
    "negative",
    "tired",
    "exhausted",
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches: RegExpMatchArray | null = content.match(regex);
    if (matches) {
      positiveCount += matches.length;
    }
  });

  negativeKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches: RegExpMatchArray | null = content.match(regex);
    if (matches) {
      negativeCount += matches.length;
    }
  });

  const totalMatches = positiveCount + negativeCount;
  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  let confidence = 0;

  if (totalMatches > 0) {
    const positiveRatio = positiveCount / totalMatches;
    confidence = Math.min(totalMatches / 5, 1); // Confidence increases with more keywords, max at 5

    if (positiveRatio > 0.6) {
      sentiment = "positive";
    } else if (positiveRatio < 0.4) {
      sentiment = "negative";
    }
  }

    return {
      noteId: note.id,
      sentiment,
      confidence: Math.round(confidence * 100) / 100,
      positiveKeywordCount: positiveCount,
      negativeKeywordCount: negativeCount,
      analysis: {
        wordCount: content.split(/\s+/).length,
        characterCount: content.length,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to analyze note sentiment",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: tag_note
// ============================================================================

const TagNoteParamsSchema = z.object({
  note_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});

type TagNoteParams = z.infer<typeof TagNoteParamsSchema>;

export const tagNoteDefinition: ToolDefinition = {
  name: "tag_note",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Add a tag to an existing note. Helps organize and categorize notes for better filtering and analysis. Note: This replaces all existing tags with the new tag.",
  useCases: [
    "When user asks 'tag this note as anxiety-related'",
    "When categorizing session notes by topic",
    "When organizing notes for future reference",
    "When adding metadata to notes for filtering",
  ],
  exampleCalls: [
    'tag_note({"note_id": "123e4567-e89b-12d3-a456-426614174000", "tag_id": "456e4567-e89b-12d3-a456-426614174000"})',
    'When user says: "Tag this note with stress-management"',
  ],
  parameters: {
    type: "object",
    properties: {
      note_id: {
        type: "string",
        description: "UUID of the note to tag",
      },
      tag_id: {
        type: "string",
        description: "UUID of the tag to apply",
      },
    },
    required: ["note_id", "tag_id"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  rateLimit: {
    maxCalls: 100,
    windowMs: 60000,
  },
  cacheable: false,
  tags: ["notes", "write", "tags"],
  deprecated: false,
};

export const tagNoteHandler: ToolHandler<TagNoteParams> = async (params, context) => {
  const validated = TagNoteParamsSchema.parse(params);

  try {
    const db = await getDb();
    const notesRepo = new NotesRepository(db);
    const tagsRepo = new TagsRepository(db);

    // Verify note exists and belongs to user
    const note: Note | null = await notesRepo.getNoteById(context.userId, validated.note_id);
    if (!note) {
      throw new AppError(`Note with ID ${validated.note_id} not found`, "NOT_FOUND", "database", false, 404);
    }

    // Verify tag exists and belongs to user (or is a system tag)
    const tag = await tagsRepo.getTagById(context.userId, validated.tag_id);
    if (!tag) {
      throw new AppError(`Tag with ID ${validated.tag_id} not found`, "NOT_FOUND", "database", false, 404);
    }

    // Apply tag to note (replaces existing tags)
    await tagsRepo.applyTagsToNote(context.userId, validated.note_id, [validated.tag_id]);

    return {
      noteId: validated.note_id,
      tagId: validated.tag_id,
      success: true,
      message: "Tag applied successfully",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to apply tag to note",
      "TAG_APPLICATION_ERROR",
      "database",
      true,
      500
    );
  }
};

// ============================================================================
// TOOL: summarize_notes
// ============================================================================

const SummarizeNotesParamsSchema = z.object({
  contact_id: z.string().uuid(),
  limit: z.number().int().positive().max(50).default(10),
});

type SummarizeNotesParams = z.infer<typeof SummarizeNotesParamsSchema>;

export const summarizeNotesDefinition: ToolDefinition = {
  name: "summarize_notes",
  category: "analytics",
  version: "1.0.0",
  description:
    "Generate a summary of multiple notes for a specific contact. Returns key themes, sentiment trends, and important highlights from recent notes.",
  useCases: [
    "When user asks 'summarize Sarah's recent notes'",
    "When preparing for a session and need quick context",
    "When reviewing client progress over time",
    "When creating reports about client engagement",
  ],
  exampleCalls: [
    'summarize_notes({"contact_id": "123e4567-e89b-12d3-a456-426614174000", "limit": 5})',
    'When user says: "Give me a summary of John\'s recent sessions"',
  ],
  parameters: {
    type: "object",
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact whose notes to summarize",
      },
      limit: {
        type: "number",
        description: "Maximum number of recent notes to include (default: 10, max: 50)",
      },
    },
    required: ["contact_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 600,
  tags: ["notes", "analytics", "summary"],
  deprecated: false,
};

export const summarizeNotesHandler: ToolHandler<SummarizeNotesParams> = async (
  params,
  context,
) => {
  const validated = SummarizeNotesParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = new NotesRepository(db);

    const notes: Note[] = await repo.getNotesByContactId(context.userId, validated.contact_id);

    if (notes.length === 0) {
      return {
        contactId: validated.contact_id,
        notesCount: 0,
        summary: "No notes found for this contact.",
        themes: [],
        sentimentTrend: "neutral" as const,
      };
    }

  // Limit notes
  const limitedNotes: Note[] = notes.slice(0, validated.limit);

  // Extract key information
  const totalWords: number = limitedNotes.reduce(
    (sum: number, note: Note) => sum + note.contentPlain.split(/\s+/).length,
    0,
  );

  // Simple keyword extraction for themes
  const allContent: string = limitedNotes.map((n: Note) => n.contentPlain.toLowerCase()).join(" ");
  const words: string[] = allContent.split(/\s+/);
  const wordFreq: Record<string, number> = {};

  // Common words to ignore
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "is",
    "was",
    "are",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "should",
    "could",
    "can",
    "may",
    "might",
    "must",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "my",
    "your",
    "his",
    "her",
    "its",
    "our",
    "their",
  ]);

  words.forEach((word: string) => {
    const cleaned: string = word.replace(/[^a-z]/g, "");
    if (cleaned.length > 3 && !stopWords.has(cleaned)) {
      wordFreq[cleaned] = (wordFreq[cleaned] ?? 0) + 1;
    }
  });

  // Get top themes
  const themes: Array<{ word: string; frequency: number }> = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, frequency: count }));

  // Calculate overall sentiment trend (simplified)
  let totalPositive = 0;
  let totalNegative = 0;

  limitedNotes.forEach((note: Note) => {
    const content: string = note.contentPlain.toLowerCase();
    const positiveWords: string[] = [
      "happy",
      "great",
      "good",
      "better",
      "improved",
      "progress",
      "positive",
      "calm",
    ];
    const negativeWords: string[] = [
      "sad",
      "angry",
      "anxious",
      "stressed",
      "pain",
      "difficult",
      "worse",
      "negative",
    ];

    positiveWords.forEach((word: string) => {
      if (content.includes(word)) totalPositive++;
    });
    negativeWords.forEach((word: string) => {
      if (content.includes(word)) totalNegative++;
    });
  });

  let sentimentTrend: "positive" | "neutral" | "negative" = "neutral";
  if (totalPositive > totalNegative * 1.5) {
    sentimentTrend = "positive";
  } else if (totalNegative > totalPositive * 1.5) {
    sentimentTrend = "negative";
  }

    const lastNote = limitedNotes[limitedNotes.length - 1];
    const firstNote = limitedNotes[0];

    return {
      contactId: validated.contact_id,
      notesCount: limitedNotes.length,
      totalNotesAvailable: notes.length,
      dateRange: {
        earliest: lastNote?.createdAt ?? null,
        latest: firstNote?.createdAt ?? null,
      },
      summary: `Analyzed ${limitedNotes.length} notes with approximately ${totalWords} words.`,
      themes: themes.map((t) => t.word),
      sentimentTrend,
      statistics: {
        averageWordCount: Math.round(totalWords / limitedNotes.length),
        totalWords,
        positiveIndicators: totalPositive,
        negativeIndicators: totalNegative,
      },
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to summarize notes",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: rank_notes_by_relevance
// ============================================================================

const RankNotesByRelevanceParamsSchema = z.object({
  query: z.string().min(1),
  contact_id: z.string().uuid().optional(),
  limit: z.number().int().positive().max(50).default(10),
});

type RankNotesByRelevanceParams = z.infer<typeof RankNotesByRelevanceParamsSchema>;

export const rankNotesByRelevanceDefinition: ToolDefinition = {
  name: "rank_notes_by_relevance",
  category: "analytics",
  version: "1.0.0",
  description:
    "Sort notes by relevance to a specific query. Uses keyword matching and frequency analysis to rank notes from most to least relevant.",
  useCases: [
    "When user asks 'which notes are most relevant to anxiety?'",
    "When finding the most important notes about a topic",
    "When prioritizing which notes to review first",
    "When identifying key documentation for specific issues",
  ],
  exampleCalls: [
    'rank_notes_by_relevance({"query": "stress management", "limit": 5})',
    'rank_notes_by_relevance({"query": "progress", "contact_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'When user says: "Show me the most relevant notes about sleep"',
  ],
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query to rank notes by relevance",
      },
      contact_id: {
        type: "string",
        description: "Filter notes for specific contact UUID (optional)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 10, max: 50)",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300,
  tags: ["notes", "analytics", "search", "ranking"],
  deprecated: false,
};

export const rankNotesByRelevanceHandler: ToolHandler<RankNotesByRelevanceParams> = async (
  params,
  context,
) => {
  const validated = RankNotesByRelevanceParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = new NotesRepository(db);

    // Get notes
    let notes: Note[];
    if (validated.contact_id) {
      notes = await repo.getNotesByContactId(context.userId, validated.contact_id);
    } else {
      notes = await repo.listNotes(context.userId);
    }

    if (notes.length === 0) {
      return {
        query: validated.query,
        results: [],
        totalNotes: 0,
        matchedNotes: 0,
      };
    }

  // Calculate relevance score for each note
  const queryTerms: string[] = validated.query.toLowerCase().split(/\s+/);

  const rankedNotes: Array<{ note: Note; relevanceScore: number }> = notes
    .map((note: Note) => {
      const content: string = note.contentPlain.toLowerCase();
      let score = 0;

      queryTerms.forEach((term: string) => {
        // Exact phrase match (highest weight)
        if (content.includes(validated.query.toLowerCase())) {
          score += 10;
        }

        // Individual term matches
        const regex = new RegExp(`\\b${term}\\b`, "gi");
        const matches: RegExpMatchArray | null = content.match(regex);
        if (matches) {
          score += matches.length * 2;
        }

        // Partial word matches (lower weight)
        if (content.includes(term)) {
          score += 1;
        }
      });

      // Boost score for recent notes (recency bias)
      if (note.createdAt) {
        const daysSinceCreation: number = Math.floor(
          (Date.now() - note.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceCreation < 7) {
          score += 5;
        } else if (daysSinceCreation < 30) {
          score += 2;
        }
      }

      return {
        note,
        relevanceScore: score,
      };
    })
    .filter((item) => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, validated.limit);

    return {
      query: validated.query,
      results: rankedNotes.map((item) => ({
        noteId: item.note.id,
        contactId: item.note.contactId,
        contentPreview: item.note.contentPlain.substring(0, 200),
        relevanceScore: item.relevanceScore,
        createdAt: item.note.createdAt ?? null,
      })),
      totalNotes: notes.length,
      matchedNotes: rankedNotes.length,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to rank notes by relevance",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
};

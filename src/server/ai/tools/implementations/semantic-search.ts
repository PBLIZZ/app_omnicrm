/**
 * Chat & Semantic Search Tools
 *
 * AI-callable tools for conversation history search, thread summaries,
 * semantic search across all content types, and embeddings management.
 *
 * Key features:
 * - Context-aware chat history search
 * - Semantic similarity across contacts, notes, emails, tasks
 * - Embeddings generation and management
 * - Content relationships and patterns
 */

import type { ToolDefinition, ToolHandler } from "../types";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { getDb } from "@/server/db/client";
import {
  createChatRepository,
  createContactsRepository,
  createEmbeddingsRepository,
} from "@repo";
import { ilike, or, and, eq, sql } from "drizzle-orm";
import { contacts, notes, tasks } from "@/server/db/schema";

// ============================================================================
// TOOL 1: search_conversation_history
// ============================================================================

const SearchConversationHistoryParamsSchema = z.object({
  query: z.string().min(1).max(500),
  thread_id: z.string().uuid().optional(),
  max_results: z.number().int().positive().max(100).default(20),
});

type SearchConversationHistoryParams = z.infer<typeof SearchConversationHistoryParamsSchema>;

interface ConversationSearchResult {
  messageId: string;
  threadId: string;
  threadTitle: string | null;
  role: string;
  contentPreview: string;
  createdAt: Date;
  relevanceScore: number;
}

interface SearchConversationHistoryResult {
  query: string;
  results: ConversationSearchResult[];
  totalResults: number;
}

export const searchConversationHistoryDefinition: ToolDefinition = {
  name: "search_conversation_history",
  category: "analytics",
  version: "1.0.0",
  description:
    "Search past chat messages and conversation history by keyword or phrase. Returns relevant messages with context from previous conversations.",
  useCases: [
    "When user asks 'what did we discuss about Sarah last week?'",
    "When looking for 'find our conversation about yoga protocols'",
    "When user wants to 'search chat history for anxiety treatments'",
    "When recalling previous discussions or decisions",
  ],
  exampleCalls: [
    'search_conversation_history({"query": "anxiety protocols", "max_results": 10})',
    'search_conversation_history({"query": "Sarah", "thread_id": "thread-uuid"})',
    'When user says: "What did we talk about regarding stress management?"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Search query for chat messages (keywords or phrases)",
      },
      thread_id: {
        type: "string",
        description: "Optional: Limit search to specific conversation thread",
      },
      max_results: {
        type: "number",
        description: "Maximum number of results to return (default: 20, max: 100)",
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
  tags: ["chat", "search", "conversation", "history"],
  deprecated: false,
};

export const searchConversationHistoryHandler: ToolHandler<
  SearchConversationHistoryParams,
  SearchConversationHistoryResult
> = async (params) => {
  const validated = SearchConversationHistoryParamsSchema.parse(params);

  try {
    // TODO: Implement proper full-text search on message content
    // For now, return mock structure showing the pattern
    const mockResults: ConversationSearchResult[] = [
      {
        messageId: "msg-001",
        threadId: validated.thread_id || "thread-001",
        threadTitle: "Discussion about client protocols",
        role: "assistant",
        contentPreview: `Found information about "${validated.query}" in previous discussion...`,
        createdAt: new Date(),
        relevanceScore: 0.85,
      },
    ];

    return {
      query: validated.query,
      results: mockResults.slice(0, validated.max_results),
      totalResults: mockResults.length,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to search conversation history",
      "CONVERSATION_SEARCH_FAILED",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 2: get_thread_summary
// ============================================================================

const GetThreadSummaryParamsSchema = z.object({
  thread_id: z.string().uuid(),
  include_tool_calls: z.boolean().default(false),
});

type GetThreadSummaryParams = z.infer<typeof GetThreadSummaryParamsSchema>;

interface ThreadSummary {
  threadId: string;
  title: string | null;
  messageCount: number;
  firstMessageAt: Date;
  lastMessageAt: Date;
  participants: string[];
  topics: string[];
  toolCallCount?: number;
  summary: string;
}

export const getThreadSummaryDefinition: ToolDefinition = {
  name: "get_thread_summary",
  category: "analytics",
  version: "1.0.0",
  description:
    "Generate a summary of a chat thread including message count, participants, topics discussed, and key points. Useful for recalling context of previous conversations.",
  useCases: [
    "When user asks 'summarize our last conversation'",
    "When needing 'what did we cover in thread X?'",
    "When user wants to 'recap our discussion about client protocols'",
    "When preparing for continued conversation",
  ],
  exampleCalls: [
    'get_thread_summary({"thread_id": "thread-uuid"})',
    'get_thread_summary({"thread_id": "thread-uuid", "include_tool_calls": true})',
    'When user says: "Summarize our conversation from yesterday"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      thread_id: {
        type: "string",
        description: "UUID of the conversation thread to summarize",
      },
      include_tool_calls: {
        type: "boolean",
        description: "Whether to include tool call statistics in summary (default: false)",
      },
    },
    required: ["thread_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 600,
  tags: ["chat", "summary", "thread", "conversation"],
  deprecated: false,
};

export const getThreadSummaryHandler: ToolHandler<
  GetThreadSummaryParams,
  ThreadSummary
> = async (params, context) => {
  const validated = GetThreadSummaryParamsSchema.parse(params);
  const db = await getDb();
  const chatRepo = createChatRepository(db);

  try {
    const threadWithMessages = await chatRepo.getThreadWithMessages(
      context.userId,
      validated.thread_id,
    );

    if (!threadWithMessages) {
      throw new AppError(
        `Thread with ID ${validated.thread_id} not found`,
        "THREAD_NOT_FOUND",
        "validation",
        true,
        404,
      );
    }

    const messageCount = threadWithMessages.messages.length;
    const firstMessage = threadWithMessages.messages[0];
    const lastMessage = threadWithMessages.messages[messageCount - 1];

    // Extract unique participants (roles)
    const participants = Array.from(
      new Set(threadWithMessages.messages.map((m) => m.role)),
    );

    // TODO: Implement proper topic extraction from message content
    const topics = ["general discussion"];

    // Generate summary
    const firstMessageDate = firstMessage?.createdAt
      ? new Date(firstMessage.createdAt).toLocaleDateString()
      : "unknown";
    const summary = `This conversation contains ${messageCount} messages between ${participants.join(", ")}. Started ${firstMessageDate}.`;

    return {
      threadId: threadWithMessages.id,
      title: threadWithMessages.title,
      messageCount,
      firstMessageAt: firstMessage?.createdAt || new Date(),
      lastMessageAt: lastMessage?.createdAt || new Date(),
      participants,
      topics,
      summary,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get thread summary",
      "THREAD_SUMMARY_FAILED",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 3: semantic_search_all
// ============================================================================

const SemanticSearchAllParamsSchema = z.object({
  query: z.string().min(1).max(500),
  entity_types: z
    .array(z.enum(["contact", "note", "email", "task"]))
    .default(["contact", "note", "email", "task"]),
  max_results: z.number().int().positive().max(100).default(20),
});

type SemanticSearchAllParams = z.infer<typeof SemanticSearchAllParamsSchema>;

interface SemanticSearchResultItem {
  id: string;
  type: "contact" | "note" | "email" | "task";
  title: string;
  preview: string;
  relevanceScore: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

interface SemanticSearchAllResult {
  query: string;
  results: SemanticSearchResultItem[];
  totalResults: number;
  searchedTypes: string[];
}

export const semanticSearchAllDefinition: ToolDefinition = {
  name: "semantic_search_all",
  category: "analytics",
  version: "1.0.0",
  description:
    "Search across ALL content types (contacts, notes, emails, tasks) using semantic similarity. Returns relevant results from multiple entity types ranked by relevance.",
  useCases: [
    "When user asks 'find everything related to stress management'",
    "When looking for 'search all content about Sarah'",
    "When user wants to 'find anything mentioning yoga protocols'",
    "When performing comprehensive content discovery",
  ],
  exampleCalls: [
    'semantic_search_all({"query": "stress management", "max_results": 20})',
    'semantic_search_all({"query": "anxiety", "entity_types": ["note", "email"]})',
    'When user says: "Find all content related to meditation practices"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Search query for semantic matching across all content",
      },
      entity_types: {
        type: "array",
        description:
          "Types of entities to search (default: all types: contact, note, email, task)",
      },
      max_results: {
        type: "number",
        description: "Maximum total results across all types (default: 20, max: 100)",
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
  tags: ["search", "semantic", "cross-entity", "discovery"],
  deprecated: false,
};

export const semanticSearchAllHandler: ToolHandler<
  SemanticSearchAllParams,
  SemanticSearchAllResult
> = async (params, context) => {
  const validated = SemanticSearchAllParamsSchema.parse(params);
  const db = await getDb();

  try {
    const results: SemanticSearchResultItem[] = [];

    // TODO: Implement proper semantic search using embeddings
    // For now, use basic text search as placeholder

    // Search contacts
    if (validated.entity_types.includes("contact")) {
      const contactResults = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, context.userId),
            or(
              ilike(contacts.displayName, `%${validated.query}%`),
              ilike(contacts.primaryEmail, `%${validated.query}%`),
            ),
          ),
        )
        .limit(5);

      results.push(
        ...contactResults.map((c) => ({
          id: c.id,
          type: "contact" as const,
          title: c.displayName,
          preview: `${c.primaryEmail || ""} - ${c.lifecycleStage || "unknown stage"}`,
          relevanceScore: 0.8,
          createdAt: c.createdAt || new Date(),
        })),
      );
    }

    // Search notes
    if (validated.entity_types.includes("note")) {
      const noteResults = await db
        .select()
        .from(notes)
        .where(
          and(eq(notes.userId, context.userId), ilike(notes.contentPlain, `%${validated.query}%`)),
        )
        .limit(5);

      results.push(
        ...noteResults.map((n) => ({
          id: n.id,
          type: "note" as const,
          title: `Note from ${n.createdAt.toLocaleDateString()}`,
          preview: n.contentPlain.substring(0, 150),
          relevanceScore: 0.75,
          createdAt: n.createdAt,
        })),
      );
    }

    // Search tasks
    if (validated.entity_types.includes("task")) {
      const taskResults = await db
        .select()
        .from(tasks)
        .where(
          and(eq(tasks.userId, context.userId), ilike(tasks.name, `%${validated.query}%`)),
        )
        .limit(5);

      results.push(
        ...taskResults.map((t) => ({
          id: t.id,
          type: "task" as const,
          title: t.name,
          preview: `Status: ${t.status} - Priority: ${t.priority}`,
          relevanceScore: 0.7,
          createdAt: t.createdAt || new Date(),
          metadata: { status: t.status, priority: t.priority },
        })),
      );
    }

    // Sort by relevance and limit
    const sortedResults = results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, validated.max_results);

    return {
      query: validated.query,
      results: sortedResults,
      totalResults: sortedResults.length,
      searchedTypes: validated.entity_types,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to perform semantic search",
      "SEMANTIC_SEARCH_FAILED",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 4: find_similar_contacts
// ============================================================================

const FindSimilarContactsParamsSchema = z.object({
  contact_id: z.string().uuid(),
  similarity_criteria: z
    .array(z.enum(["engagement", "lifecycle_stage", "tags", "services", "demographics"]))
    .default(["engagement", "lifecycle_stage"]),
  max_results: z.number().int().positive().max(50).default(10),
});

type FindSimilarContactsParams = z.infer<typeof FindSimilarContactsParamsSchema>;

interface SimilarContact {
  contactId: string;
  displayName: string;
  similarityScore: number;
  matchingCriteria: string[];
  lifecycleStage: string | null;
  primaryEmail: string | null;
}

interface FindSimilarContactsResult {
  sourceContact: {
    id: string;
    displayName: string;
  };
  similarContacts: SimilarContact[];
  totalResults: number;
}

export const findSimilarContactsDefinition: ToolDefinition = {
  name: "find_similar_contacts",
  category: "analytics",
  version: "1.0.0",
  description:
    "Find contacts with similar patterns, characteristics, or engagement levels. Useful for identifying client segments, referral patterns, or targeted outreach.",
  useCases: [
    "When user asks 'find clients similar to Sarah'",
    "When looking for 'contacts with similar engagement patterns'",
    "When user wants to 'identify similar VIP clients'",
    "When building targeted communication lists",
  ],
  exampleCalls: [
    'find_similar_contacts({"contact_id": "contact-uuid", "max_results": 10})',
    'find_similar_contacts({"contact_id": "contact-uuid", "similarity_criteria": ["lifecycle_stage", "tags"]})',
    'When user says: "Find clients similar to John for a referral program"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact to find similar contacts for",
      },
      similarity_criteria: {
        type: "array",
        description:
          "Criteria for similarity matching (default: engagement, lifecycle_stage)",
      },
      max_results: {
        type: "number",
        description: "Maximum number of similar contacts to return (default: 10, max: 50)",
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
  tags: ["contacts", "similarity", "patterns", "analytics"],
  deprecated: false,
};

export const findSimilarContactsHandler: ToolHandler<
  FindSimilarContactsParams,
  FindSimilarContactsResult
> = async (params, context) => {
  const validated = FindSimilarContactsParamsSchema.parse(params);
  const db = await getDb();
  const contactsRepo = createContactsRepository(db);

  try {
    const sourceContact = await contactsRepo.getContactById(context.userId, validated.contact_id);

    if (!sourceContact) {
      throw new AppError(
        `Contact with ID ${validated.contact_id} not found`,
        "CONTACT_NOT_FOUND",
        "validation",
        true,
        404,
      );
    }

    // TODO: Implement proper similarity matching using embeddings and multiple criteria
    // For now, find contacts with same lifecycle stage
    const similarContactRows = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.userId, context.userId),
          eq(contacts.lifecycleStage, sourceContact.lifecycleStage || ""),
          sql`${contacts.id} != ${validated.contact_id}`,
        ),
      )
      .limit(validated.max_results);

    const similarContacts: SimilarContact[] = similarContactRows.map((c) => ({
      contactId: c.id,
      displayName: c.displayName,
      similarityScore: 0.75,
      matchingCriteria: ["lifecycle_stage"],
      lifecycleStage: c.lifecycleStage,
      primaryEmail: c.primaryEmail,
    }));

    return {
      sourceContact: {
        id: sourceContact.id,
        displayName: sourceContact.displayName,
      },
      similarContacts,
      totalResults: similarContacts.length,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : "Failed to find similar contacts",
      "SIMILAR_CONTACTS_FAILED",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 5: find_related_content
// ============================================================================

const FindRelatedContentParamsSchema = z.object({
  context: z.string().min(1).max(1000),
  content_types: z
    .array(z.enum(["contact", "note", "task", "email"]))
    .default(["contact", "note", "task"]),
  max_results: z.number().int().positive().max(50).default(15),
});

type FindRelatedContentParams = z.infer<typeof FindRelatedContentParamsSchema>;

interface RelatedContentItem {
  id: string;
  type: string;
  title: string;
  preview: string;
  relevanceScore: number;
  relationshipReason: string;
}

interface FindRelatedContentResult {
  context: string;
  relatedContent: RelatedContentItem[];
  totalResults: number;
}

export const findRelatedContentDefinition: ToolDefinition = {
  name: "find_related_content",
  category: "analytics",
  version: "1.0.0",
  description:
    "Find content related to the current conversation context. Uses semantic understanding to surface relevant contacts, notes, tasks, or emails that might be useful for the current discussion.",
  useCases: [
    "When user asks 'what else do we have about this topic?'",
    "When looking for 'related information about stress management'",
    "When user wants to 'show me relevant content for this discussion'",
    "When building context for current conversation",
  ],
  exampleCalls: [
    'find_related_content({"context": "discussing anxiety protocols for new client", "max_results": 15})',
    'find_related_content({"context": "yoga for back pain", "content_types": ["note", "contact"]})',
    'When user says: "Show me related content for what we\'re discussing"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      context: {
        type: "string",
        description:
          "Current conversation context or topic to find related content for (1-1000 chars)",
      },
      content_types: {
        type: "array",
        description:
          "Types of content to search (default: contact, note, task)",
      },
      max_results: {
        type: "number",
        description: "Maximum number of related items to return (default: 15, max: 50)",
      },
    },
    required: ["context"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300,
  tags: ["search", "context", "related", "discovery"],
  deprecated: false,
};

export const findRelatedContentHandler: ToolHandler<
  FindRelatedContentParams,
  FindRelatedContentResult
> = async (params) => {
  const validated = FindRelatedContentParamsSchema.parse(params);

  try {
    // TODO: Implement proper semantic matching using embeddings
    // For now, return mock structure
    const mockRelatedContent: RelatedContentItem[] = [
      {
        id: "related-001",
        type: "note",
        title: "Session notes related to context",
        preview: `Found relevant information about "${validated.context.substring(0, 50)}"`,
        relevanceScore: 0.82,
        relationshipReason: "Shares similar concepts and terminology",
      },
    ];

    return {
      context: validated.context,
      relatedContent: mockRelatedContent.slice(0, validated.max_results),
      totalResults: mockRelatedContent.length,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to find related content",
      "RELATED_CONTENT_FAILED",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 6: generate_embeddings
// ============================================================================

const GenerateEmbeddingsParamsSchema = z.object({
  content_type: z.enum(["contact", "note", "task", "email", "document"]),
  content_id: z.string().uuid(),
  force_regenerate: z.boolean().default(false),
});

type GenerateEmbeddingsParams = z.infer<typeof GenerateEmbeddingsParamsSchema>;

interface GenerateEmbeddingsResult {
  contentType: string;
  contentId: string;
  embeddingsCreated: number;
  status: "created" | "updated" | "skipped";
  message: string;
}

export const generateEmbeddingsDefinition: ToolDefinition = {
  name: "generate_embeddings",
  category: "external",
  version: "1.0.0",
  description:
    "Generate vector embeddings for content to enable semantic search. Costs credits because it calls OpenAI/Anthropic embedding APIs. Embeddings enable AI to understand semantic similarity between content.",
  useCases: [
    "When user explicitly requests 'create embeddings for this content'",
    "When setting up new content for semantic search",
    "When user wants to 'enable AI search for this document'",
    "When preparing content for similarity matching",
  ],
  exampleCalls: [
    'generate_embeddings({"content_type": "note", "content_id": "note-uuid"})',
    'generate_embeddings({"content_type": "document", "content_id": "doc-uuid", "force_regenerate": true})',
    'When user says: "Generate embeddings for this note to make it searchable"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      content_type: {
        type: "string",
        description: "Type of content to generate embeddings for",
      },
      content_id: {
        type: "string",
        description: "UUID of the content item",
      },
      force_regenerate: {
        type: "boolean",
        description: "Force regeneration even if embeddings exist (default: false)",
      },
    },
    required: ["content_type", "content_id"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 5, // Costs credits - calls embedding API
  isIdempotent: true,
  cacheable: false,
  rateLimit: {
    maxCalls: 20,
    windowMs: 3600000, // 20 calls per hour
  },
  tags: ["embeddings", "semantic", "ai", "external-api", "paid"],
  deprecated: false,
};

export const generateEmbeddingsHandler: ToolHandler<
  GenerateEmbeddingsParams,
  GenerateEmbeddingsResult
> = async (params, context) => {
  const validated = GenerateEmbeddingsParamsSchema.parse(params);
  const db = await getDb();
  const embeddingsRepo = createEmbeddingsRepository(db);

  try {
    // Check if embeddings already exist
    const existing = await embeddingsRepo.listEmbeddingsForOwner(
      context.userId,
      validated.content_type,
      validated.content_id,
    );

    if (existing.length > 0 && !validated.force_regenerate) {
      return {
        contentType: validated.content_type,
        contentId: validated.content_id,
        embeddingsCreated: 0,
        status: "skipped",
        message: "Embeddings already exist. Use force_regenerate to recreate.",
      };
    }

    // TODO: Implement actual embedding generation using OpenAI/Anthropic API
    // For now, return mock success
    return {
      contentType: validated.content_type,
      contentId: validated.content_id,
      embeddingsCreated: 1,
      status: "created",
      message: "Embeddings generated successfully (TODO: integrate with actual embedding API)",
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to generate embeddings",
      "EMBEDDINGS_GENERATION_FAILED",
      "network",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 7: update_embeddings
// ============================================================================

const UpdateEmbeddingsParamsSchema = z.object({
  content_type: z.enum(["contact", "note", "task", "email", "document"]).optional(),
  older_than_days: z.number().int().positive().max(365).default(30),
  max_items: z.number().int().positive().max(100).default(50),
});

type UpdateEmbeddingsParams = z.infer<typeof UpdateEmbeddingsParamsSchema>;

interface UpdateEmbeddingsResult {
  itemsFound: number;
  itemsUpdated: number;
  itemsFailed: number;
  message: string;
}

export const updateEmbeddingsDefinition: ToolDefinition = {
  name: "update_embeddings",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Refresh outdated embeddings for content that has been modified. Free operation that identifies stale embeddings and queues them for regeneration.",
  useCases: [
    "When user asks 'update stale embeddings'",
    "When looking for 'refresh embeddings for modified content'",
    "When user wants to 'ensure semantic search is up to date'",
    "When maintaining embedding freshness",
  ],
  exampleCalls: [
    'update_embeddings({"older_than_days": 30, "max_items": 50})',
    'update_embeddings({"content_type": "note", "older_than_days": 7})',
    'When user says: "Update embeddings for content modified in the last week"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      content_type: {
        type: "string",
        description: "Optional: Limit to specific content type",
      },
      older_than_days: {
        type: "number",
        description: "Update embeddings older than N days (default: 30, max: 365)",
      },
      max_items: {
        type: "number",
        description: "Maximum number of items to update (default: 50, max: 100)",
      },
    },
    required: [],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0, // Free - just queues updates
  isIdempotent: true,
  cacheable: false,
  rateLimit: {
    maxCalls: 5,
    windowMs: 3600000, // 5 calls per hour
  },
  tags: ["embeddings", "maintenance", "refresh"],
  deprecated: false,
};

export const updateEmbeddingsHandler: ToolHandler<
  UpdateEmbeddingsParams,
  UpdateEmbeddingsResult
> = async (params, context) => {
  const validated = UpdateEmbeddingsParamsSchema.parse(params);
  const db = await getDb();
  const embeddingsRepo = createEmbeddingsRepository(db);

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - validated.older_than_days);

    const filters: Parameters<typeof embeddingsRepo.listEmbeddings>[1] = {
      createdBefore: cutoffDate,
      pageSize: validated.max_items,
    };

    if (validated.content_type) {
      filters.ownerType = [validated.content_type];
    }

    const { items } = await embeddingsRepo.listEmbeddings(context.userId, filters);

    // TODO: Queue embeddings for regeneration
    // For now, just return count
    return {
      itemsFound: items.length,
      itemsUpdated: 0,
      itemsFailed: 0,
      message: `Found ${items.length} embeddings older than ${validated.older_than_days} days (TODO: implement queuing)`,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to update embeddings",
      "EMBEDDINGS_UPDATE_FAILED",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 8: search_by_embedding
// ============================================================================

const SearchByEmbeddingParamsSchema = z.object({
  query_text: z.string().min(1).max(500),
  content_types: z
    .array(z.enum(["contact", "note", "task", "email", "document"]))
    .default(["note", "document"]),
  max_results: z.number().int().positive().max(50).default(10),
  similarity_threshold: z.number().min(0).max(1).default(0.7),
});

type SearchByEmbeddingParams = z.infer<typeof SearchByEmbeddingParamsSchema>;

interface EmbeddingSearchResult {
  id: string;
  contentType: string;
  contentId: string;
  title: string;
  preview: string;
  similarityScore: number;
}

interface SearchByEmbeddingResult {
  query: string;
  results: EmbeddingSearchResult[];
  totalResults: number;
}

export const searchByEmbeddingDefinition: ToolDefinition = {
  name: "search_by_embedding",
  category: "analytics",
  version: "1.0.0",
  description:
    "Perform semantic similarity search using vector embeddings. Finds content semantically similar to the query even if exact keywords don't match. More powerful than keyword search.",
  useCases: [
    "When user asks 'find content semantically similar to this'",
    "When looking for 'search by meaning not just keywords'",
    "When user wants to 'find conceptually related content'",
    "When traditional keyword search is insufficient",
  ],
  exampleCalls: [
    'search_by_embedding({"query_text": "dealing with chronic stress", "max_results": 10})',
    'search_by_embedding({"query_text": "yoga poses", "content_types": ["note"], "similarity_threshold": 0.8})',
    'When user says: "Find content with similar meaning to stress management"',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      query_text: {
        type: "string",
        description: "Text query to find semantically similar content",
      },
      content_types: {
        type: "array",
        description: "Types of content to search (default: note, document)",
      },
      max_results: {
        type: "number",
        description: "Maximum number of results (default: 10, max: 50)",
      },
      similarity_threshold: {
        type: "number",
        description: "Minimum similarity score 0-1 (default: 0.7)",
      },
    },
    required: ["query_text"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300,
  tags: ["search", "embeddings", "semantic", "similarity"],
  deprecated: false,
};

export const searchByEmbeddingHandler: ToolHandler<
  SearchByEmbeddingParams,
  SearchByEmbeddingResult
> = async (params) => {
  const validated = SearchByEmbeddingParamsSchema.parse(params);

  try {
    // TODO: Implement actual vector similarity search using embeddings
    // This requires:
    // 1. Generate embedding for query_text
    // 2. Perform vector similarity search (cosine similarity) against stored embeddings
    // 3. Filter by content_types and similarity_threshold
    // 4. Return results ordered by similarity score

    // For now, return mock structure
    const mockResults: EmbeddingSearchResult[] = [
      {
        id: "emb-001",
        contentType: "note",
        contentId: "note-001",
        title: "Semantically similar content",
        preview: `Content conceptually related to "${validated.query_text}"`,
        similarityScore: 0.85,
      },
    ];

    return {
      query: validated.query_text,
      results: mockResults
        .filter((r) => r.similarityScore >= validated.similarity_threshold)
        .slice(0, validated.max_results),
      totalResults: mockResults.length,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to search by embedding",
      "EMBEDDING_SEARCH_FAILED",
      "database",
      false,
      500,
    );
  }
};

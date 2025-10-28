/**
 * Gmail Integration Tools
 *
 * AI-callable tools for Gmail email operations in the wellness CRM.
 * Implements data access and grouping tools for the Gmail domain.
 *
 * Data Source: Emails are stored in the `interactions` table with type='email'.
 */

import type { ToolDefinition, ToolHandler } from "@/server/ai/tools/types";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { createInteractionsRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";
import type { Interaction } from "@/server/db/schema";

// ============================================================================
// TOOL: get_email
// ============================================================================

const GetEmailParamsSchema = z.object({
  email_id: z.string().uuid(),
});

type GetEmailParams = z.infer<typeof GetEmailParamsSchema>;

export const getEmailDefinition: ToolDefinition = {
  name: "get_email",
  category: "data_access",
  version: "1.0.0",
  description:
    "Retrieve complete details for a specific email by ID. Returns email subject, body, sender, timestamp, and metadata.",
  useCases: [
    "When user asks 'show me the email with ID abc123'",
    "When reviewing a specific email from search results",
    "When analyzing email content in detail",
    "When verifying email details before action",
  ],
  exampleCalls: [
    'get_email({"email_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'When user says: "Show me the email from yesterday"',
  ],
  parameters: {
    type: "object",
    properties: {
      email_id: {
        type: "string",
        description: "UUID of the email to retrieve",
      },
    },
    required: ["email_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300,
  tags: ["gmail", "email", "read"],
  deprecated: false,
};

export const getEmailHandler: ToolHandler<GetEmailParams> = async (params, context) => {
  const validated = GetEmailParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = createInteractionsRepository(db);

    const email = await repo.getInteractionById(context.userId, validated.email_id);

    if (!email) {
      throw new AppError(
        `Email with ID ${validated.email_id} not found`,
        "EMAIL_NOT_FOUND",
        "validation",
        true,
        404
      );
    }

    // Verify this is actually an email
    if (email.type !== "email") {
      throw new AppError(
        `Interaction ${validated.email_id} is not an email (type: ${email.type})`,
        "INVALID_TYPE",
        "validation",
        true,
        400
      );
    }

    return email;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get email",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: search_emails
// ============================================================================

const SearchEmailsParamsSchema = z.object({
  query: z.string().optional(),
  sender: z.string().optional(),
  subject_contains: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).default(20),
});

type SearchEmailsParams = z.infer<typeof SearchEmailsParamsSchema>;

export const searchEmailsDefinition: ToolDefinition = {
  name: "search_emails",
  category: "data_access",
  version: "1.0.0",
  description:
    "Search emails by sender, subject, content, or date range. Returns matching emails with pagination support.",
  useCases: [
    "When user asks 'find all emails from sarah@example.com'",
    "When user wants 'show me emails about yoga'",
    "When user searches 'emails from last week'",
    "When filtering emails by specific criteria",
  ],
  exampleCalls: [
    'search_emails({"sender": "sarah@example.com", "limit": 10})',
    'search_emails({"subject_contains": "appointment", "start_date": "2025-01-01T00:00:00Z"})',
    'search_emails({"query": "wellness retreat"})',
    'When user says: "Find emails about stress management"',
  ],
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "General search term for subject or body content (optional)",
      },
      sender: {
        type: "string",
        description: "Filter by sender email address or name (optional)",
      },
      subject_contains: {
        type: "string",
        description: "Filter by text in subject line (optional)",
      },
      start_date: {
        type: "string",
        description: "Filter emails on or after this date (ISO 8601 format, optional)",
      },
      end_date: {
        type: "string",
        description: "Filter emails on or before this date (ISO 8601 format, optional)",
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
  tags: ["gmail", "email", "search", "read"],
  deprecated: false,
};

export const searchEmailsHandler: ToolHandler<SearchEmailsParams> = async (params, context) => {
  const validated = SearchEmailsParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = createInteractionsRepository(db);

    // Build search parameters for interactions repository
    const searchParams: {
      types: string[];
      search?: string;
      occurredAfter?: Date;
      occurredBefore?: Date;
      pageSize: number;
      page: number;
    } = {
      types: ["email"],
      pageSize: validated.limit,
      page: 1,
    };

    const searchTerm = validated.query || validated.subject_contains;
    if (searchTerm) {
      searchParams.search = searchTerm;
    }
    if (validated.start_date) {
      searchParams.occurredAfter = new Date(validated.start_date);
    }
    if (validated.end_date) {
      searchParams.occurredBefore = new Date(validated.end_date);
    }

    const { items, total } = await repo.listInteractions(context.userId, searchParams);

    // Filter by sender if specified (metadata filtering)
    let emails = items;
    if (validated.sender) {
      emails = items.filter((email) => {
        const meta = email.sourceMeta as { from?: string } | null;
        if (!meta) return false;
        return meta.from?.toLowerCase().includes(validated.sender!.toLowerCase());
      });
    }

    return {
      emails,
      count: emails.length,
      total,
      query: validated.query || validated.subject_contains,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to search emails",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: list_email_threads
// ============================================================================

const ListEmailThreadsParamsSchema = z.object({
  contact_id: z.string().uuid().optional(),
  limit: z.number().int().positive().max(50).default(10),
});

type ListEmailThreadsParams = z.infer<typeof ListEmailThreadsParamsSchema>;

export const listEmailThreadsDefinition: ToolDefinition = {
  name: "list_email_threads",
  category: "data_access",
  version: "1.0.0",
  description:
    "Get conversation threads from emails. Groups emails by contact and displays as conversations ordered by most recent.",
  useCases: [
    "When user asks 'show me my email conversations'",
    "When user wants 'list email threads'",
    "When viewing conversation history with a contact",
    "When preparing for client communication",
  ],
  exampleCalls: [
    'list_email_threads({"limit": 10})',
    'list_email_threads({"contact_id": "123e4567-e89b-12d3-a456-426614174000", "limit": 5})',
    'When user says: "Show me recent email conversations"',
  ],
  parameters: {
    type: "object",
    properties: {
      contact_id: {
        type: "string",
        description: "Filter threads for specific contact UUID (optional)",
      },
      limit: {
        type: "number",
        description: "Maximum number of threads to return (default: 10, max: 50)",
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
  tags: ["gmail", "email", "threads", "read"],
  deprecated: false,
};

export const listEmailThreadsHandler: ToolHandler<ListEmailThreadsParams> = async (
  params,
  context
) => {
  const validated = ListEmailThreadsParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = createInteractionsRepository(db);

    const searchParams: {
      types: string[];
      contactId?: string;
      pageSize: number;
      page: number;
    } = {
      types: ["email"],
      pageSize: 200, // Get more to group properly
      page: 1,
    };

    if (validated.contact_id) {
      searchParams.contactId = validated.contact_id;
    }

    const { items } = await repo.listInteractions(context.userId, searchParams);

    // Group by contact
    const threadsByContact = new Map<string, Interaction[]>();

    items.forEach((email) => {
      if (!email.contactId) return;

      const existing = threadsByContact.get(email.contactId);
      if (existing) {
        existing.push(email);
      } else {
        threadsByContact.set(email.contactId, [email]);
      }
    });

    // Convert to thread objects
    const threads = Array.from(threadsByContact.entries())
      .map(([contactId, emails]) => {
        const sortedEmails = emails.sort(
          (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()
        );

        return {
          contactId,
          emailCount: emails.length,
          latestEmail: sortedEmails[0],
          earliestEmail: sortedEmails[sortedEmails.length - 1],
          emails: sortedEmails,
        };
      })
      .sort((a, b) => {
        const aTime = a.latestEmail?.occurredAt.getTime() ?? 0;
        const bTime = b.latestEmail?.occurredAt.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, validated.limit);

    return {
      threads,
      threadCount: threads.length,
      totalEmailCount: items.length,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to list email threads",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: get_emails_by_contact
// ============================================================================

const GetEmailsByContactParamsSchema = z.object({
  contact_id: z.string().uuid(),
  limit: z.number().int().positive().max(100).default(50),
});

type GetEmailsByContactParams = z.infer<typeof GetEmailsByContactParamsSchema>;

export const getEmailsByContactDefinition: ToolDefinition = {
  name: "get_emails_by_contact",
  category: "data_access",
  version: "1.0.0",
  description:
    "Get all emails for a specific contact. Returns emails sorted by date (most recent first) with complete content and metadata.",
  useCases: [
    "When user asks 'show me all emails from Sarah'",
    "When preparing for client session",
    "When reviewing communication history",
    "When analyzing client engagement",
  ],
  exampleCalls: [
    'get_emails_by_contact({"contact_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'get_emails_by_contact({"contact_id": "123e4567-e89b-12d3-a456-426614174000", "limit": 10})',
    'When user says: "Get all emails with John"',
  ],
  parameters: {
    type: "object",
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact whose emails to retrieve",
      },
      limit: {
        type: "number",
        description: "Maximum number of emails to return (default: 50, max: 100)",
      },
    },
    required: ["contact_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300,
  tags: ["gmail", "email", "contact", "read"],
  deprecated: false,
};

export const getEmailsByContactHandler: ToolHandler<GetEmailsByContactParams> = async (
  params,
  context
) => {
  const validated = GetEmailsByContactParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = createInteractionsRepository(db);

    const { items, total } = await repo.listInteractions(context.userId, {
      types: ["email"],
      contactId: validated.contact_id,
      pageSize: validated.limit,
      page: 1,
      sort: "occurredAt",
      order: "desc",
    });

    return {
      contactId: validated.contact_id,
      emails: items,
      count: items.length,
      total,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get emails by contact",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: group_emails_by_sender
// ============================================================================

const GroupEmailsBySenderParamsSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  min_emails: z.number().int().positive().default(1),
});

type GroupEmailsBySenderParams = z.infer<typeof GroupEmailsBySenderParamsSchema>;

export const groupEmailsBySenderDefinition: ToolDefinition = {
  name: "group_emails_by_sender",
  category: "data_access",
  version: "1.0.0",
  description:
    "Group emails by sender for bulk actions. Returns senders with email counts, useful for organizing and prioritizing inbox.",
  useCases: [
    "When user asks 'group my emails by sender'",
    "When user wants 'who has emailed me most this week'",
    "When organizing inbox for bulk processing",
    "When identifying top correspondents",
  ],
  exampleCalls: [
    'group_emails_by_sender({})',
    'group_emails_by_sender({"start_date": "2025-01-01T00:00:00Z", "min_emails": 3})',
    'When user says: "Show me who emails me the most"',
  ],
  parameters: {
    type: "object",
    properties: {
      start_date: {
        type: "string",
        description: "Filter emails on or after this date (ISO 8601 format, optional)",
      },
      end_date: {
        type: "string",
        description: "Filter emails on or before this date (ISO 8601 format, optional)",
      },
      min_emails: {
        type: "number",
        description: "Minimum number of emails required to include sender (default: 1)",
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
  tags: ["gmail", "email", "grouping", "analytics"],
  deprecated: false,
};

export const groupEmailsBySenderHandler: ToolHandler<GroupEmailsBySenderParams> = async (
  params,
  context
) => {
  const validated = GroupEmailsBySenderParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = createInteractionsRepository(db);

    const searchParams: {
      types: string[];
      occurredAfter?: Date;
      occurredBefore?: Date;
      pageSize: number;
      page: number;
    } = {
      types: ["email"],
      pageSize: 200,
      page: 1,
    };

    if (validated.start_date) {
      searchParams.occurredAfter = new Date(validated.start_date);
    }
    if (validated.end_date) {
      searchParams.occurredBefore = new Date(validated.end_date);
    }

    const { items } = await repo.listInteractions(context.userId, searchParams);

    // Group by sender (extracted from metadata)
    const senderGroups = new Map<
      string,
      { sender: string; contactId: string | null; emails: Interaction[]; count: number }
    >();

    items.forEach((email) => {
      const meta = email.sourceMeta as { from?: string } | null;
      const sender = meta?.from || "Unknown";

      const existing = senderGroups.get(sender);
      if (existing) {
        existing.emails.push(email);
        existing.count++;
      } else {
        senderGroups.set(sender, {
          sender,
          contactId: email.contactId,
          emails: [email],
          count: 1,
        });
      }
    });

    // Filter by minimum emails and sort by count
    const groups = Array.from(senderGroups.values())
      .filter((group) => group.count >= validated.min_emails)
      .sort((a, b) => b.count - a.count);

    return {
      groups: groups.map((g) => ({
        sender: g.sender,
        contactId: g.contactId,
        emailCount: g.count,
        latestEmail: g.emails[0],
        earliestEmail: g.emails[g.emails.length - 1],
      })),
      totalGroups: groups.length,
      totalEmails: items.length,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to group emails by sender",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: group_emails_by_topic
// ============================================================================

const GroupEmailsByTopicParamsSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.number().int().positive().max(20).default(10),
});

type GroupEmailsByTopicParams = z.infer<typeof GroupEmailsByTopicParamsSchema>;

export const groupEmailsByTopicDefinition: ToolDefinition = {
  name: "group_emails_by_topic",
  category: "data_access",
  version: "1.0.0",
  description:
    "AI categorization of emails by topic using keyword analysis. Groups emails into common themes like appointments, wellness, marketing, etc.",
  useCases: [
    "When user asks 'categorize my emails by topic'",
    "When user wants 'what topics am I getting emails about'",
    "When organizing inbox by content themes",
    "When identifying communication patterns",
  ],
  exampleCalls: [
    'group_emails_by_topic({})',
    'group_emails_by_topic({"start_date": "2025-01-01T00:00:00Z", "limit": 5})',
    'When user says: "What are my emails about this week?"',
  ],
  parameters: {
    type: "object",
    properties: {
      start_date: {
        type: "string",
        description: "Filter emails on or after this date (ISO 8601 format, optional)",
      },
      end_date: {
        type: "string",
        description: "Filter emails on or before this date (ISO 8601 format, optional)",
      },
      limit: {
        type: "number",
        description: "Maximum number of topic groups to return (default: 10, max: 20)",
      },
    },
    required: [],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 600,
  tags: ["gmail", "email", "categorization", "analytics"],
  deprecated: false,
};

export const groupEmailsByTopicHandler: ToolHandler<GroupEmailsByTopicParams> = async (
  params,
  context
) => {
  const validated = GroupEmailsByTopicParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = createInteractionsRepository(db);

    const searchParams: {
      types: string[];
      occurredAfter?: Date;
      occurredBefore?: Date;
      pageSize: number;
      page: number;
    } = {
      types: ["email"],
      pageSize: 200,
      page: 1,
    };

    if (validated.start_date) {
      searchParams.occurredAfter = new Date(validated.start_date);
    }
    if (validated.end_date) {
      searchParams.occurredBefore = new Date(validated.end_date);
    }

    const { items } = await repo.listInteractions(context.userId, searchParams);

    // Define topic categories with keywords
    const topicKeywords = {
      appointments: ["appointment", "session", "schedule", "booking", "meeting", "calendar"],
      wellness: ["yoga", "meditation", "wellness", "health", "therapy", "massage", "reiki"],
      marketing: ["newsletter", "promotion", "offer", "sale", "discount", "subscribe"],
      billing: ["invoice", "payment", "bill", "receipt", "subscription", "charge"],
      feedback: ["feedback", "review", "testimonial", "survey", "rating"],
      questions: ["question", "how", "what", "when", "where", "why", "help"],
      administrative: ["confirm", "reminder", "notification", "update", "account"],
    };

    // Categorize emails
    const topicGroups = new Map<string, { topic: string; emails: Interaction[]; count: number }>();

    items.forEach((email) => {
      const content = `${email.subject || ""} ${email.bodyText || ""}`.toLowerCase();

      let bestTopic = "other";
      let maxMatches = 0;

      // Find best matching topic
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        const matches = keywords.filter((keyword) => content.includes(keyword)).length;
        if (matches > maxMatches) {
          maxMatches = matches;
          bestTopic = topic;
        }
      });

      const existing = topicGroups.get(bestTopic);
      if (existing) {
        existing.emails.push(email);
        existing.count++;
      } else {
        topicGroups.set(bestTopic, {
          topic: bestTopic,
          emails: [email],
          count: 1,
        });
      }
    });

    // Sort by count and limit
    const groups = Array.from(topicGroups.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, validated.limit);

    return {
      groups: groups.map((g) => ({
        topic: g.topic,
        emailCount: g.count,
        percentage: Math.round((g.count / items.length) * 100),
        latestEmail: g.emails[0],
      })),
      totalGroups: topicGroups.size,
      totalEmails: items.length,
      categorized: items.length - (topicGroups.get("other")?.count || 0),
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to group emails by topic",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: categorize_email
// ============================================================================

const CategorizeEmailParamsSchema = z.object({
  email_id: z.string().uuid(),
});

type CategorizeEmailParams = z.infer<typeof CategorizeEmailParamsSchema>;

export const categorizeEmailDefinition: ToolDefinition = {
  name: "categorize_email",
  category: "analytics",
  version: "1.0.0",
  description:
    "Classify an email as marketing, wellness, business, or other based on content analysis using keyword matching.",
  useCases: [
    "When user asks 'what category is this email?'",
    "When organizing emails for digest generation",
    "When filtering emails by type",
    "When preparing weekly summaries",
  ],
  exampleCalls: [
    'categorize_email({"email_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'When user says: "What type of email is this?"',
  ],
  parameters: {
    type: "object",
    properties: {
      email_id: {
        type: "string",
        description: "UUID of the email to categorize",
      },
    },
    required: ["email_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 600,
  tags: ["gmail", "email", "categorization", "analytics"],
  deprecated: false,
};

export const categorizeEmailHandler: ToolHandler<CategorizeEmailParams> = async (
  params,
  context
) => {
  const validated = CategorizeEmailParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = createInteractionsRepository(db);

    const email = await repo.getInteractionById(context.userId, validated.email_id);

    if (!email) {
      throw new AppError(
        `Email with ID ${validated.email_id} not found`,
        "EMAIL_NOT_FOUND",
        "validation",
        true,
        404
      );
    }

    if (email.type !== "email") {
      throw new AppError(
        `Interaction ${validated.email_id} is not an email (type: ${email.type})`,
        "INVALID_TYPE",
        "validation",
        true,
        400
      );
    }

    const content = `${email.subject || ""} ${email.bodyText || ""}`.toLowerCase();

    // Category keywords
    const categoryKeywords = {
      marketing: [
        "newsletter",
        "promotion",
        "offer",
        "sale",
        "discount",
        "subscribe",
        "unsubscribe",
        "special offer",
        "limited time",
        "marketing",
        "advertisement",
        "promo",
      ],
      wellness: [
        "yoga",
        "meditation",
        "wellness",
        "health",
        "therapy",
        "massage",
        "reiki",
        "mindfulness",
        "healing",
        "holistic",
        "practitioner",
        "session",
        "treatment",
        "practice",
      ],
      business: [
        "invoice",
        "payment",
        "bill",
        "receipt",
        "contract",
        "agreement",
        "meeting",
        "appointment",
        "schedule",
        "business",
        "professional",
        "service",
      ],
    };

    // Score each category
    const categoryScores: Record<string, number> = {
      marketing: 0,
      wellness: 0,
      business: 0,
      other: 0,
    };

    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      const matches = keywords.filter((keyword) => content.includes(keyword)).length;
      categoryScores[category] = matches;
    });

    // Determine best category
    let bestCategory = "other";
    let maxScore = 0;

    Object.entries(categoryScores).forEach(([category, score]) => {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    });

    return {
      emailId: validated.email_id,
      category: bestCategory,
      confidence: maxScore > 0 ? Math.min(maxScore * 0.2, 1.0) : 0.1,
      categoryScores,
      subject: email.subject,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to categorize email",
      "DB_ERROR",
      "database",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: generate_marketing_digest
// ============================================================================

const GenerateMarketingDigestParamsSchema = z.object({
  date_from: z.string().datetime(),
  date_to: z.string().datetime(),
  format: z.enum(["summary", "detailed"]).default("summary"),
});

type GenerateMarketingDigestParams = z.infer<typeof GenerateMarketingDigestParamsSchema>;

export const generateMarketingDigestDefinition: ToolDefinition = {
  name: "generate_marketing_digest",
  category: "external",
  version: "1.0.0",
  description:
    "Generate AI-powered summary of marketing emails within a date range. Identifies trends, top senders, and key promotional content using LLM analysis.",
  useCases: [
    "When user asks 'summarize my marketing emails this week'",
    "When user wants 'what promotions did I receive?'",
    "When reviewing newsletter and promotional content",
    "When preparing weekly marketing inbox review",
  ],
  exampleCalls: [
    'generate_marketing_digest({"date_from": "2025-01-01T00:00:00Z", "date_to": "2025-01-07T23:59:59Z", "format": "summary"})',
    'generate_marketing_digest({"date_from": "2025-01-01T00:00:00Z", "date_to": "2025-01-31T23:59:59Z", "format": "detailed"})',
    'When user says: "Give me a digest of marketing emails from last week"',
  ],
  parameters: {
    type: "object",
    properties: {
      date_from: {
        type: "string",
        description: "Start date for digest in ISO 8601 format (required)",
      },
      date_to: {
        type: "string",
        description: "End date for digest in ISO 8601 format (required)",
      },
      format: {
        type: "string",
        description: "Digest format: summary (brief overview) or detailed (comprehensive analysis)",
        enum: ["summary", "detailed"],
      },
    },
    required: ["date_from", "date_to"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 5,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 3600,
  tags: ["gmail", "digest", "marketing", "ai-powered"],
  deprecated: false,
};

export const generateMarketingDigestHandler: ToolHandler<GenerateMarketingDigestParams> = async (
  params,
  context
) => {
  const validated = GenerateMarketingDigestParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = createInteractionsRepository(db);

    // Get marketing emails in date range
    const { items } = await repo.listInteractions(context.userId, {
      types: ["email"],
      occurredAfter: new Date(validated.date_from),
      occurredBefore: new Date(validated.date_to),
      pageSize: 500,
      page: 1,
    });

    // Filter for marketing emails using keyword categorization
    const marketingKeywords = [
      "newsletter",
      "promotion",
      "offer",
      "sale",
      "discount",
      "subscribe",
      "unsubscribe",
      "special offer",
      "limited time",
      "marketing",
      "advertisement",
      "promo",
    ];

    const marketingEmails = items.filter((email) => {
      const content = `${email.subject || ""} ${email.bodyText || ""}`.toLowerCase();
      return marketingKeywords.some((keyword) => content.includes(keyword));
    });

    // Extract top senders
    const senderCounts = new Map<string, number>();
    marketingEmails.forEach((email) => {
      const meta = email.sourceMeta as { from?: string } | null;
      const sender = meta?.from || "Unknown";
      senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1);
    });

    const topSenders = Array.from(senderCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sender, count]) => ({ sender, count }));

    // TODO: Integrate with OpenRouter/LLM service for AI-generated digest
    // For now, return structured data that would be processed by LLM
    const digest =
      validated.format === "summary"
        ? `Marketing Digest (${validated.date_from} to ${validated.date_to}):\n\n` +
          `Total Marketing Emails: ${marketingEmails.length}\n` +
          `Top Senders: ${topSenders.map((s) => `${s.sender} (${s.count})`).join(", ")}\n\n` +
          `[TODO: LLM-generated summary of key promotions and trends]`
        : `Detailed Marketing Digest (${validated.date_from} to ${validated.date_to}):\n\n` +
          `Total Marketing Emails: ${marketingEmails.length}\n\n` +
          `Top Senders:\n${topSenders.map((s) => `- ${s.sender}: ${s.count} emails`).join("\n")}\n\n` +
          `[TODO: LLM-generated detailed analysis with promotional themes, offers, and recommendations]`;

    return {
      digest,
      email_count: marketingEmails.length,
      top_senders: topSenders,
      date_range: {
        from: validated.date_from,
        to: validated.date_to,
      },
      format: validated.format,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to generate marketing digest",
      "DIGEST_ERROR",
      "internal",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: generate_wellness_digest
// ============================================================================

const GenerateWellnessDigestParamsSchema = z.object({
  date_from: z.string().datetime(),
  date_to: z.string().datetime(),
  format: z.enum(["summary", "detailed"]).default("summary"),
});

type GenerateWellnessDigestParams = z.infer<typeof GenerateWellnessDigestParamsSchema>;

export const generateWellnessDigestDefinition: ToolDefinition = {
  name: "generate_wellness_digest",
  category: "external",
  version: "1.0.0",
  description:
    "Generate AI-powered summary of wellness-related emails within a date range. Highlights health topics, practitioner communications, and wellness trends using LLM analysis.",
  useCases: [
    "When user asks 'summarize my wellness emails this month'",
    "When user wants 'what health topics came up in my inbox?'",
    "When reviewing practitioner and client wellness communications",
    "When preparing for wellness practice review",
  ],
  exampleCalls: [
    'generate_wellness_digest({"date_from": "2025-01-01T00:00:00Z", "date_to": "2025-01-31T23:59:59Z", "format": "summary"})',
    'generate_wellness_digest({"date_from": "2025-01-01T00:00:00Z", "date_to": "2025-01-07T23:59:59Z", "format": "detailed"})',
    'When user says: "Give me a wellness email digest for this week"',
  ],
  parameters: {
    type: "object",
    properties: {
      date_from: {
        type: "string",
        description: "Start date for digest in ISO 8601 format (required)",
      },
      date_to: {
        type: "string",
        description: "End date for digest in ISO 8601 format (required)",
      },
      format: {
        type: "string",
        description: "Digest format: summary (brief overview) or detailed (comprehensive analysis)",
        enum: ["summary", "detailed"],
      },
    },
    required: ["date_from", "date_to"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 5,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 3600,
  tags: ["gmail", "digest", "wellness", "ai-powered"],
  deprecated: false,
};

export const generateWellnessDigestHandler: ToolHandler<GenerateWellnessDigestParams> = async (
  params,
  context
) => {
  const validated = GenerateWellnessDigestParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = createInteractionsRepository(db);

    // Get emails in date range
    const { items } = await repo.listInteractions(context.userId, {
      types: ["email"],
      occurredAfter: new Date(validated.date_from),
      occurredBefore: new Date(validated.date_to),
      pageSize: 500,
      page: 1,
    });

    // Filter for wellness emails using keyword categorization
    const wellnessKeywords = [
      "yoga",
      "meditation",
      "wellness",
      "health",
      "therapy",
      "massage",
      "reiki",
      "mindfulness",
      "healing",
      "holistic",
      "practitioner",
      "session",
      "treatment",
      "practice",
      "nutrition",
      "exercise",
      "mental health",
      "stress",
      "anxiety",
    ];

    const wellnessEmails = items.filter((email) => {
      const content = `${email.subject || ""} ${email.bodyText || ""}`.toLowerCase();
      return wellnessKeywords.some((keyword) => content.includes(keyword));
    });

    // Extract wellness topics
    const topicCounts = new Map<string, number>();
    const topicKeywords = {
      yoga: ["yoga", "asana", "vinyasa"],
      meditation: ["meditation", "mindfulness", "breathing"],
      therapy: ["therapy", "counseling", "mental health"],
      nutrition: ["nutrition", "diet", "eating", "food"],
      fitness: ["exercise", "fitness", "workout", "training"],
    };

    wellnessEmails.forEach((email) => {
      const content = `${email.subject || ""} ${email.bodyText || ""}`.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some((keyword) => content.includes(keyword))) {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        }
      });
    });

    const wellnessTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([topic, count]) => ({ topic, count }));

    // TODO: Integrate with OpenRouter/LLM service for AI-generated digest
    const digest =
      validated.format === "summary"
        ? `Wellness Digest (${validated.date_from} to ${validated.date_to}):\n\n` +
          `Total Wellness Emails: ${wellnessEmails.length}\n` +
          `Top Topics: ${wellnessTopics.map((t) => `${t.topic} (${t.count})`).join(", ")}\n\n` +
          `[TODO: LLM-generated summary of wellness themes and key insights]`
        : `Detailed Wellness Digest (${validated.date_from} to ${validated.date_to}):\n\n` +
          `Total Wellness Emails: ${wellnessEmails.length}\n\n` +
          `Topics Covered:\n${wellnessTopics.map((t) => `- ${t.topic}: ${t.count} emails`).join("\n")}\n\n` +
          `[TODO: LLM-generated detailed analysis of wellness trends, practitioner communications, and action items]`;

    return {
      digest,
      email_count: wellnessEmails.length,
      wellness_topics: wellnessTopics,
      date_range: {
        from: validated.date_from,
        to: validated.date_to,
      },
      format: validated.format,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to generate wellness digest",
      "DIGEST_ERROR",
      "internal",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: generate_business_digest
// ============================================================================

const GenerateBusinessDigestParamsSchema = z.object({
  date_from: z.string().datetime(),
  date_to: z.string().datetime(),
  format: z.enum(["summary", "detailed"]).default("summary"),
});

type GenerateBusinessDigestParams = z.infer<typeof GenerateBusinessDigestParamsSchema>;

export const generateBusinessDigestDefinition: ToolDefinition = {
  name: "generate_business_digest",
  category: "external",
  version: "1.0.0",
  description:
    "Generate AI-powered summary of business emails within a date range. Extracts action items, meeting summaries, and key business decisions using LLM analysis.",
  useCases: [
    "When user asks 'summarize my business emails this week'",
    "When user wants 'what action items do I have from emails?'",
    "When reviewing professional communications and decisions",
    "When preparing weekly business review",
  ],
  exampleCalls: [
    'generate_business_digest({"date_from": "2025-01-01T00:00:00Z", "date_to": "2025-01-07T23:59:59Z", "format": "summary"})',
    'generate_business_digest({"date_from": "2025-01-01T00:00:00Z", "date_to": "2025-01-31T23:59:59Z", "format": "detailed"})',
    'When user says: "Give me a business email digest for last month"',
  ],
  parameters: {
    type: "object",
    properties: {
      date_from: {
        type: "string",
        description: "Start date for digest in ISO 8601 format (required)",
      },
      date_to: {
        type: "string",
        description: "End date for digest in ISO 8601 format (required)",
      },
      format: {
        type: "string",
        description: "Digest format: summary (brief overview) or detailed (comprehensive analysis)",
        enum: ["summary", "detailed"],
      },
    },
    required: ["date_from", "date_to"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 5,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 3600,
  tags: ["gmail", "digest", "business", "ai-powered"],
  deprecated: false,
};

export const generateBusinessDigestHandler: ToolHandler<GenerateBusinessDigestParams> = async (
  params,
  context
) => {
  const validated = GenerateBusinessDigestParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = createInteractionsRepository(db);

    // Get emails in date range
    const { items } = await repo.listInteractions(context.userId, {
      types: ["email"],
      occurredAfter: new Date(validated.date_from),
      occurredBefore: new Date(validated.date_to),
      pageSize: 500,
      page: 1,
    });

    // Filter for business emails using keyword categorization
    const businessKeywords = [
      "invoice",
      "payment",
      "bill",
      "receipt",
      "contract",
      "agreement",
      "meeting",
      "appointment",
      "schedule",
      "business",
      "professional",
      "service",
      "proposal",
      "quote",
      "deadline",
      "project",
      "deliverable",
    ];

    const businessEmails = items.filter((email) => {
      const content = `${email.subject || ""} ${email.bodyText || ""}`.toLowerCase();
      return businessKeywords.some((keyword) => content.includes(keyword));
    });

    // Extract action items (simplified - LLM would do better job)
    const actionItemKeywords = [
      "please",
      "need",
      "required",
      "deadline",
      "by",
      "asap",
      "urgent",
      "review",
      "approve",
      "sign",
      "complete",
    ];

    const actionItems = businessEmails
      .filter((email) => {
        const content = `${email.subject || ""} ${email.bodyText || ""}`.toLowerCase();
        return actionItemKeywords.some((keyword) => content.includes(keyword));
      })
      .slice(0, 10)
      .map((email) => ({
        subject: email.subject || "No subject",
        from: (email.sourceMeta as { from?: string } | null)?.from || "Unknown",
        date: email.occurredAt,
      }));

    // TODO: Integrate with OpenRouter/LLM service for AI-generated digest
    const digest =
      validated.format === "summary"
        ? `Business Digest (${validated.date_from} to ${validated.date_to}):\n\n` +
          `Total Business Emails: ${businessEmails.length}\n` +
          `Potential Action Items: ${actionItems.length}\n\n` +
          `[TODO: LLM-generated summary of key business communications and decisions]`
        : `Detailed Business Digest (${validated.date_from} to ${validated.date_to}):\n\n` +
          `Total Business Emails: ${businessEmails.length}\n\n` +
          `Action Items:\n${actionItems.map((item) => `- ${item.subject} (from ${item.from})`).join("\n")}\n\n` +
          `[TODO: LLM-generated detailed analysis with meeting summaries, decisions, and follow-up items]`;

    return {
      digest,
      email_count: businessEmails.length,
      action_items: actionItems,
      date_range: {
        from: validated.date_from,
        to: validated.date_to,
      },
      format: validated.format,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to generate business digest",
      "DIGEST_ERROR",
      "internal",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: generate_general_digest
// ============================================================================

const GenerateGeneralDigestParamsSchema = z.object({
  date_from: z.string().datetime(),
  date_to: z.string().datetime(),
  format: z.enum(["summary", "detailed"]).default("summary"),
});

type GenerateGeneralDigestParams = z.infer<typeof GenerateGeneralDigestParamsSchema>;

export const generateGeneralDigestDefinition: ToolDefinition = {
  name: "generate_general_digest",
  category: "external",
  version: "1.0.0",
  description:
    "Generate AI-powered summary of all uncategorized/general emails within a date range. Provides overview of personal, miscellaneous, and other communications using LLM analysis.",
  useCases: [
    "When user asks 'summarize my other emails this week'",
    "When user wants 'what else is in my inbox?'",
    "When reviewing emails that don't fit other categories",
    "When preparing comprehensive inbox review",
  ],
  exampleCalls: [
    'generate_general_digest({"date_from": "2025-01-01T00:00:00Z", "date_to": "2025-01-07T23:59:59Z", "format": "summary"})',
    'generate_general_digest({"date_from": "2025-01-01T00:00:00Z", "date_to": "2025-01-31T23:59:59Z", "format": "detailed"})',
    'When user says: "Give me a digest of uncategorized emails"',
  ],
  parameters: {
    type: "object",
    properties: {
      date_from: {
        type: "string",
        description: "Start date for digest in ISO 8601 format (required)",
      },
      date_to: {
        type: "string",
        description: "End date for digest in ISO 8601 format (required)",
      },
      format: {
        type: "string",
        description: "Digest format: summary (brief overview) or detailed (comprehensive analysis)",
        enum: ["summary", "detailed"],
      },
    },
    required: ["date_from", "date_to"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 5,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 3600,
  tags: ["gmail", "digest", "general", "ai-powered"],
  deprecated: false,
};

export const generateGeneralDigestHandler: ToolHandler<GenerateGeneralDigestParams> = async (
  params,
  context
) => {
  const validated = GenerateGeneralDigestParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = createInteractionsRepository(db);

    // Get all emails in date range
    const { items } = await repo.listInteractions(context.userId, {
      types: ["email"],
      occurredAfter: new Date(validated.date_from),
      occurredBefore: new Date(validated.date_to),
      pageSize: 500,
      page: 1,
    });

    // Define all category keywords
    const allCategoryKeywords = [
      // Marketing
      "newsletter",
      "promotion",
      "offer",
      "sale",
      "discount",
      "subscribe",
      // Wellness
      "yoga",
      "meditation",
      "wellness",
      "health",
      "therapy",
      "massage",
      // Business
      "invoice",
      "payment",
      "meeting",
      "appointment",
      "contract",
      "business",
    ];

    // Filter for general/uncategorized emails
    const generalEmails = items.filter((email) => {
      const content = `${email.subject || ""} ${email.bodyText || ""}`.toLowerCase();
      return !allCategoryKeywords.some((keyword) => content.includes(keyword));
    });

    // Group by category for context
    const categoryCounts = {
      marketing: items.filter((e) => {
        const content = `${e.subject || ""} ${e.bodyText || ""}`.toLowerCase();
        return ["newsletter", "promotion", "offer"].some((k) => content.includes(k));
      }).length,
      wellness: items.filter((e) => {
        const content = `${e.subject || ""} ${e.bodyText || ""}`.toLowerCase();
        return ["yoga", "wellness", "health"].some((k) => content.includes(k));
      }).length,
      business: items.filter((e) => {
        const content = `${e.subject || ""} ${e.bodyText || ""}`.toLowerCase();
        return ["invoice", "meeting", "business"].some((k) => content.includes(k));
      }).length,
      general: generalEmails.length,
    };

    // TODO: Integrate with OpenRouter/LLM service for AI-generated digest
    const digest =
      validated.format === "summary"
        ? `General Email Digest (${validated.date_from} to ${validated.date_to}):\n\n` +
          `Total Emails: ${items.length}\n` +
          `General/Uncategorized: ${generalEmails.length}\n\n` +
          `Category Breakdown:\n` +
          `- Marketing: ${categoryCounts.marketing}\n` +
          `- Wellness: ${categoryCounts.wellness}\n` +
          `- Business: ${categoryCounts.business}\n` +
          `- General: ${categoryCounts.general}\n\n` +
          `[TODO: LLM-generated summary of general communications and patterns]`
        : `Detailed General Digest (${validated.date_from} to ${validated.date_to}):\n\n` +
          `Total Emails: ${items.length}\n\n` +
          `Distribution:\n${Object.entries(categoryCounts).map(([cat, count]) => `- ${cat}: ${count} emails`).join("\n")}\n\n` +
          `[TODO: LLM-generated detailed analysis of uncategorized emails with insights and recommendations]`;

    return {
      digest,
      email_count: items.length,
      categories: categoryCounts,
      date_range: {
        from: validated.date_from,
        to: validated.date_to,
      },
      format: validated.format,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to generate general digest",
      "DIGEST_ERROR",
      "internal",
      false,
      500
    );
  }
};

// ============================================================================
// TOOL: generate_weekly_digest_all
// ============================================================================

const GenerateWeeklyDigestAllParamsSchema = z.object({
  week_start_date: z.string().datetime(),
  include_categories: z
    .array(z.enum(["marketing", "wellness", "business", "general"]))
    .default(["marketing", "wellness", "business", "general"]),
});

type GenerateWeeklyDigestAllParams = z.infer<typeof GenerateWeeklyDigestAllParamsSchema>;

export const generateWeeklyDigestAllDefinition: ToolDefinition = {
  name: "generate_weekly_digest_all",
  category: "external",
  version: "1.0.0",
  description:
    "Generate comprehensive AI-powered weekly email digest across all categories. Provides holistic overview of the week's communications with highlights, trends, and action items using advanced LLM analysis.",
  useCases: [
    "When user asks 'give me my weekly email summary'",
    "When user wants 'what happened in my inbox this week?'",
    "When preparing weekly review and planning session",
    "When generating end-of-week executive summary",
  ],
  exampleCalls: [
    'generate_weekly_digest_all({"week_start_date": "2025-01-06T00:00:00Z"})',
    'generate_weekly_digest_all({"week_start_date": "2025-01-06T00:00:00Z", "include_categories": ["wellness", "business"]})',
    'When user says: "Give me my weekly email digest"',
  ],
  parameters: {
    type: "object",
    properties: {
      week_start_date: {
        type: "string",
        description: "Start date of the week (Monday) in ISO 8601 format (required)",
      },
      include_categories: {
        type: "array",
        description:
          "Categories to include in digest (default: all categories)",
        items: {
          type: "string",
          enum: ["marketing", "wellness", "business", "general"],
        },
      },
    },
    required: ["week_start_date"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 10,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 3600,
  tags: ["gmail", "digest", "weekly", "comprehensive", "ai-powered"],
  deprecated: false,
};

export const generateWeeklyDigestAllHandler: ToolHandler<GenerateWeeklyDigestAllParams> = async (
  params,
  context
) => {
  const validated = GenerateWeeklyDigestAllParamsSchema.parse(params);

  try {
    const db = await getDb();
    const repo = createInteractionsRepository(db);

    // Calculate week end date (7 days from start)
    const weekStart = new Date(validated.week_start_date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Get all emails in the week
    const { items } = await repo.listInteractions(context.userId, {
      types: ["email"],
      occurredAfter: weekStart,
      occurredBefore: weekEnd,
      pageSize: 1000,
      page: 1,
    });

    // Categorize emails
    const categoryKeywords = {
      marketing: ["newsletter", "promotion", "offer", "sale", "discount", "subscribe"],
      wellness: ["yoga", "meditation", "wellness", "health", "therapy", "massage"],
      business: ["invoice", "payment", "meeting", "appointment", "contract", "business"],
    };

    const categorizedEmails: Record<string, Interaction[]> = {
      marketing: [],
      wellness: [],
      business: [],
      general: [],
    };

    items.forEach((email) => {
      const content = `${email.subject || ""} ${email.bodyText || ""}`.toLowerCase();
      let categorized = false;

      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        if (!categorized && keywords.some((keyword) => content.includes(keyword))) {
          categorizedEmails[category]?.push(email);
          categorized = true;
        }
      });

      if (!categorized) {
        categorizedEmails.general?.push(email);
      }
    });

    // Build category summaries
    const byCategory: Record<string, { count: number; highlights: string[] }> = {};

    validated.include_categories.forEach((category) => {
      const emails = categorizedEmails[category] || [];
      byCategory[category] = {
        count: emails.length,
        highlights: emails
          .slice(0, 3)
          .map((e) => e.subject || "No subject"),
      };
    });

    // Extract overall highlights (top engagement emails)
    const highlights = items
      .slice(0, 5)
      .map((email) => ({
        subject: email.subject || "No subject",
        from: (email.sourceMeta as { from?: string } | null)?.from || "Unknown",
        date: email.occurredAt,
        category:
          Object.entries(categorizedEmails).find(([, emails]) =>
            emails.some((e) => e.id === email.id)
          )?.[0] || "general",
      }));

    // TODO: Integrate with OpenRouter/LLM service for comprehensive AI-generated digest
    const digest =
      `Weekly Email Digest\n` +
      `Week of ${weekStart.toISOString().split("T")[0]}\n\n` +
      `Total Emails: ${items.length}\n\n` +
      `Category Breakdown:\n${Object.entries(byCategory)
        .map(([cat, data]) => `- ${cat}: ${data.count} emails`)
        .join("\n")}\n\n` +
      `Top Highlights:\n${highlights.map((h) => `- [${h.category}] ${h.subject}`).join("\n")}\n\n` +
      `[TODO: LLM-generated comprehensive weekly analysis with:\n` +
      `- Key themes and trends across all categories\n` +
      `- Important action items and deadlines\n` +
      `- Relationship insights and follow-ups needed\n` +
      `- Recommendations for the week ahead]`;

    return {
      digest,
      total_emails: items.length,
      by_category: byCategory,
      highlights,
      week_range: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      },
      included_categories: validated.include_categories,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to generate weekly digest",
      "DIGEST_ERROR",
      "internal",
      false,
      500
    );
  }
};

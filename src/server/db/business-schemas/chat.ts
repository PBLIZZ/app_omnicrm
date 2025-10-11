/**
 * Chat System Schemas
 *
 * Domain schemas for chat/RAG functionality
 */

import { z } from "zod";

// =============================================================================
// Chat Request/Response Schemas
// =============================================================================

export const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      }),
    )
    .optional(),
});

export const ChatResponseSchema = z.object({
  response: z.string(),
  conversationId: z.string().optional(),
  sources: z.array(z.object({
    title: z.string(),
    content: z.string(),
    url: z.string().optional(),
  })).optional(),
});

// =============================================================================
// Gmail Search Schemas
// =============================================================================

export const GmailSearchRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().min(1).max(50).default(10),
});

export const GmailSearchResponseSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    subject: z.string().nullable(),
    from: z.string().nullable(),
    to: z.string().nullable(),
    date: z.string(),
    snippet: z.string().optional(),
    relevanceScore: z.number().optional(),
  })),
  totalCount: z.number(),
  query: z.string(),
});

// =============================================================================
// Gmail Insights Schemas
// =============================================================================

export const GmailInsightsQuerySchema = z.object({
  // Add any query parameters if needed
});

export const GmailInsightsResponseSchema = z.object({
  insights: z.array(
    z.object({
      type: z.string(),
      title: z.string(),
      description: z.string(),
      confidence: z.number(),
      data: z.record(z.unknown()).optional(),
    }),
  ),
  summary: z
    .object({
      totalEmails: z.number(),
      timeRange: z.string(),
      topSenders: z.array(z.string()),
    })
    .optional(),
});

// =============================================================================
// Test Schemas
// =============================================================================

export const GmailIngestTestInputSchema = z.object({});

// =============================================================================
// Type Exports
// =============================================================================

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export type GmailSearchResponse = z.infer<typeof GmailSearchResponseSchema>;

export type GmailInsightsResponse = z.infer<typeof GmailInsightsResponseSchema>;
export type GmailIngestTestInput = z.infer<typeof GmailIngestTestInputSchema>;
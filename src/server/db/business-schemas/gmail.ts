/**
 * Gmail-specific schemas
 *
 * All Gmail API route validation schemas and types
 */

import { z } from "zod";

// ============================================================================
// GMAIL-SPECIFIC SCHEMAS
// ============================================================================

/**
 * Gmail OAuth Callback Query Schema
 */
export const GmailOAuthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export type GmailOAuthCallbackQuery = z.infer<typeof GmailOAuthCallbackQuerySchema>;

/**
 * Gmail OAuth Start Response Schema
 */
export const GmailOAuthStartResponseSchema = z.object({
  authUrl: z.string().url(),
  state: z.string(),
});

export type GmailOAuthStartResponse = z.infer<typeof GmailOAuthStartResponseSchema>;

/**
 * Gmail Status Response Schema
 */
export const GmailStatusResponseSchema = z.object({
  isConnected: z.boolean(),
  reason: z.enum(['connected', 'no_integration', 'token_expired']),
  expiryDate: z.string().nullable().optional(),
  hasRefreshToken: z.boolean().optional(),
  autoRefreshed: z.boolean().optional(),
  service: z.string().optional(),
});

export type GmailStatusResponse = z.infer<typeof GmailStatusResponseSchema>;

/**
 * Gmail Sync Request Schema
 */
export const GmailSyncRequestSchema = z.object({
  incremental: z.boolean().optional().default(true),
  overlapHours: z.number().int().min(0).max(72).optional().default(0),
  daysBack: z.number().min(1).max(365).optional(),
});

export type GmailSyncRequest = z.infer<typeof GmailSyncRequestSchema>;

/**
 * Gmail Sync Response Schema
 */
export const GmailSyncResponseSchema = z.object({
  success: z.boolean(),
  messagesProcessed: z.number(),
  rawEventsCreated: z.number(),
  errors: z.array(z.string()).optional(),
  duration: z.number(),
  lastSyncTime: z.string().optional(),
});

export type GmailSyncResponse = z.infer<typeof GmailSyncResponseSchema>;

/**
 * Gmail Sync Direct Response Schema
 */
export const GmailSyncDirectResponseSchema = z.object({
  message: z.string(),
  stats: z.object({
    inserted: z.number(),
    updated: z.number().optional(),
    skipped: z.number().optional(),
    errors: z.number().optional(),
  }),
});

export type GmailSyncDirectResponse = z.infer<typeof GmailSyncDirectResponseSchema>;

/**
 * Gmail Sync Blocking Response Schema
 */
export const GmailSyncBlockingResponseSchema = z.object({
  sessionId: z.string().uuid(),
  success: z.boolean(),
  messagesProcessed: z.number(),
  normalizedInteractions: z.number(),
  duration: z.number(),
  errors: z.array(z.string()).optional(),
});

export type GmailSyncBlockingResponse = z.infer<typeof GmailSyncBlockingResponseSchema>;

/**
 * Gmail Preview Request Schema
 */
export const GmailPreviewRequestSchema = z.object({
  count: z.number().int().min(1).max(50).optional().default(10),
  includeBody: z.boolean().optional().default(false),
});

export type GmailPreviewRequest = z.infer<typeof GmailPreviewRequestSchema>;

/**
 * Gmail Preview Response Schema
 */
export const GmailPreviewResponseSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    threadId: z.string(),
    subject: z.string().nullable(),
    from: z.string().nullable(),
    to: z.string().nullable(),
    date: z.string(),
    snippet: z.string().optional(),
    body: z.string().optional(),
  })),
  totalCount: z.number(),
  hasMore: z.boolean(),
});

export type GmailPreviewResponse = z.infer<typeof GmailPreviewResponseSchema>;

/**
 * Gmail Labels Response Schema
 */
export const GmailLabelsResponseSchema = z.object({
  labels: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['system', 'user']),
    messagesTotal: z.number().optional(),
    messagesUnread: z.number().optional(),
    threadsTotal: z.number().optional(),
    threadsUnread: z.number().optional(),
  })),
});

export type GmailLabelsResponse = z.infer<typeof GmailLabelsResponseSchema>;

/**
 * Gmail Raw Events Query Schema
 */
export const GmailRawEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  provider: z.string().optional().default('gmail'),
  sort: z.enum(['occurredAt', 'createdAt']).optional().default('occurredAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  occurredAtFilter: z.string().optional(),
});

export type GmailRawEventsQuery = z.infer<typeof GmailRawEventsQuerySchema>;

/**
 * Gmail Raw Events Response Schema
 */
export const GmailRawEventsResponseSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    provider: z.string(),
    payload: z.record(z.unknown()),
    contactId: z.string().uuid().nullable(),
    occurredAt: z.string(),
    sourceMeta: z.record(z.unknown()).optional(),
    batchId: z.string().uuid().nullable(),
    sourceId: z.string().nullable(),
    createdAt: z.string(),
  })),
  total: z.number(),
});

export type GmailRawEventsResponse = z.infer<typeof GmailRawEventsResponseSchema>;

/**
 * Gmail Test Response Schema
 */
export const GmailTestResponseSchema = z.object({
  isConnected: z.boolean(),
  message: z.string(),
  errorCode: z.string().optional(),
  timestamp: z.string(),
});

export type GmailTestResponse = z.infer<typeof GmailTestResponseSchema>;

/**
 * Gmail Refresh Response Schema
 */
export const GmailRefreshResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type GmailRefreshResponse = z.infer<typeof GmailRefreshResponseSchema>;
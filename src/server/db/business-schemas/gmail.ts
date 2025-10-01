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

/**
 * Gmail Sync Request Schema
 */
export const GmailSyncRequestSchema = z.object({
  incremental: z.boolean().optional().default(true),
  overlapHours: z.number().int().min(0).max(72).optional().default(0),
  daysBack: z.number().min(1).max(365).optional(),
});

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

/**
 * Gmail Preview Request Schema
 */
export const GmailPreviewRequestSchema = z.object({
  count: z.number().int().min(1).max(50).optional().default(10),
  includeBody: z.boolean().optional().default(false),
});

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

/**
 * Gmail Test Response Schema
 */
export const GmailTestResponseSchema = z.object({
  isConnected: z.boolean(),
  message: z.string(),
  errorCode: z.string().optional(),
  timestamp: z.string(),
});

/**
 * Gmail Refresh Response Schema
 */
export const GmailRefreshResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================================================
// GMAIL INGESTION RESULT SCHEMAS
// ============================================================================

/**
 * Gmail ingestion result DTO
 */
export const GmailIngestionResultDTOSchema = z.object({
  success: z.boolean(),
  processed: z.number(),
  errors: z.array(z.string()),
  duration: z.number(),
});

export type GmailIngestionResultDTO = z.infer<typeof GmailIngestionResultDTOSchema>;

/**
 * Raw event creation DTO for Gmail ingestion
 */
export const CreateRawEventDTOSchema = z.object({
  userId: z.string().uuid(),
  sourceType: z.string(),
  sourceId: z.string(),
  eventType: z.string(),
  eventData: z.record(z.string(), z.unknown()),
  processedAt: z.coerce.date().optional(),
});

export type CreateRawEventDTO = z.infer<typeof CreateRawEventDTOSchema>;

// ============================================================================
// EMAIL AI CLASSIFICATION SCHEMAS
// ============================================================================

/**
 * Email Classification Schema - AI-powered email categorization
 */
export const EmailClassificationSchema = z.object({
  primaryCategory: z.string(),
  subCategory: z.string(),
  confidence: z.number().min(0).max(1),
  businessRelevance: z.number().min(0).max(1),
  reasoning: z.string(),
  extractedMetadata: z.object({
    senderDomain: z.string().optional(),
    hasAppointmentLanguage: z.boolean().optional(),
    hasPaymentLanguage: z.boolean().optional(),
    isFromClient: z.boolean().optional(),
    urgencyLevel: z.enum(["low", "medium", "high", "urgent"]).optional(),
  }),
});

export type EmailClassification = z.infer<typeof EmailClassificationSchema>;

// ============================================================================
// EMAIL CONNECT DASHBOARD SCHEMAS (Moved from component types)
// ============================================================================

/**
 * Email Preview Schema - Email summary for connect dashboard
 */
export const EmailPreviewSchema = z.object({
  id: z.string(),
  subject: z.string(),
  from: z.string(),
  to: z.array(z.string()).optional(),
  date: z.string(),
  snippet: z.string(),
  hasAttachments: z.boolean(),
  labels: z.array(z.string()), // For Gmail labels, Outlook categories, etc.
});

export type EmailPreview = z.infer<typeof EmailPreviewSchema>;

/**
 * Preview Range Schema - Date range for email preview
 */
export const PreviewRangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export type PreviewRange = z.infer<typeof PreviewRangeSchema>;

/**
 * Connection Status Schema - Provider-agnostic connection status
 */
export const ConnectConnectionStatusSchema = z.object({
  isConnected: z.boolean(),
  emailCount: z.number().optional(),
  contactCount: z.number().optional(),
  lastSync: z.string().optional(),
  error: z.string().optional(),
  expiryDate: z.string().optional(),
  hasRefreshToken: z.boolean().optional(),
  autoRefreshed: z.boolean().optional(),
  service: z.string().optional(), // 'gmail' | 'unified' | 'auth'
});

export type ConnectConnectionStatus = z.infer<typeof ConnectConnectionStatusSchema>;

/**
 * Job Status Schema - Background job tracking
 */
export const JobSchema = z.object({
  id: z.string(),
  kind: z.string(),
  status: z.enum(["queued", "running", "completed", "error"]),
  progress: z.number().optional(),
  message: z.string().optional(),
  batchId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  totalEmails: z.number().optional(),
  processedEmails: z.number().optional(),
  newEmails: z.number().optional(),
  chunkSize: z.number().optional(),
  chunksTotal: z.number().optional(),
  chunksProcessed: z.number().optional(),
});

export type Job = z.infer<typeof JobSchema>;

/**
 * Connect Dashboard State Schema - Complete dashboard data structure
 */
export const ConnectDashboardStateSchema = z.object({
  connection: ConnectConnectionStatusSchema,
  hasConfiguredSettings: z.boolean().optional(),
  syncStatus: z.object({
    googleConnected: z.boolean(),
    serviceTokens: z.object({
      google: z.boolean(), // For backward compatibility
      gmail: z.boolean(),
      calendar: z.boolean(),
      unified: z.boolean(),
    }),
    flags: z.object({
      gmail: z.boolean(),
      calendar: z.boolean(),
    }),
    lastSync: z.object({
      gmail: z.string().nullable(),
      calendar: z.string().nullable(),
    }),
    lastBatchId: z.string().nullable(),
    grantedScopes: z.object({
      gmail: z.unknown(),
      calendar: z.unknown(),
    }),
    jobs: z.object({
      queued: z.number(),
      done: z.number(),
      error: z.number(),
    }),
    embedJobs: z.object({
      queued: z.number(),
      done: z.number(),
      error: z.number(),
    }),
  }).optional(),
  jobs: z.object({
    active: z.array(JobSchema),
    summary: z.object({
      queued: z.number(),
      running: z.number(),
      completed: z.number(),
      failed: z.number(),
    }),
    currentBatch: z.string().nullable().optional(),
    totalEmails: z.number().optional(),
    processedEmails: z.number().optional(),
  }).nullable(),
  emailPreview: z.object({
    emails: z.array(EmailPreviewSchema),
    range: PreviewRangeSchema.nullable(),
    previewRange: PreviewRangeSchema.nullable().optional(), // Backward compatibility
  }),
  weeklyDigest: z.unknown().nullable().optional(), // Define later if needed
  marketingWikiCount: z.number().optional(),
  wikiInsightsCount: z.number().optional(), // Backward compatibility
  templateStats: z.unknown().nullable().optional(), // Define later if needed
});

export type ConnectDashboardState = z.infer<typeof ConnectDashboardStateSchema>;

/**
 * Search Result Schema - Email search results
 */
export const SearchResultSchema = z.object({
  subject: z.string(),
  date: z.string(),
  snippet: z.string(),
  similarity: z.number(),
  contactInfo: z.object({
    displayName: z.string().optional(),
  }).optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Contact Data Schema - Contact information with email count
 */
export const ContactDataSchema = z.object({
  displayName: z.string().optional(),
  email: z.string(),
  emailCount: z.number(),
});

/**
 * Email Insights Schema - AI-powered email analytics
 */
export const EmailInsightsSchema = z.object({
  patterns: z.array(z.string()).optional(),
  emailVolume: z.object({
    total: z.number(),
    thisWeek: z.number(),
    trend: z.enum(["up", "down", "stable"]),
  }).optional(),
  topContacts: z.array(ContactDataSchema).optional(),
});

export type EmailInsights = z.infer<typeof EmailInsightsSchema>;


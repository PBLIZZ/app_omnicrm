/**
 * Calendar API Business Schemas
 *
 * Schemas specific to Google Calendar integration endpoints
 */

import { z } from "zod";

// ============================================================================
// CALENDAR SYNC SCHEMAS
// ============================================================================

/**
 * Calendar Sync Request Schema
 * Used by /api/google/calendar/sync endpoint
 */
export const CalendarSyncRequestSchema = z.object({
  // Days to sync backwards from today
  daysPast: z.number().int().min(1).max(730).optional().default(180), // 6 months default
  // Days to sync forwards from today
  daysFuture: z.number().int().min(1).max(730).optional().default(365), // 1 year default
  // Maximum events to sync per calendar
  maxResults: z.number().int().min(10).max(2500).optional().default(2500),
});

export type CalendarSyncRequest = z.infer<typeof CalendarSyncRequestSchema>;

/**
 * Calendar Sync Response Schema
 */
export const CalendarSyncResponseSchema = z.object({
  ok: z.boolean(),
  data: z.object({
    message: z.string(),
    stats: z.object({
      syncedEvents: z.number(),
      processedJobs: z.number().optional(),
      daysPast: z.number(),
      daysFuture: z.number(),
      maxResults: z.number(),
      batchId: z.string().optional(),
    }),
  }),
});

export type CalendarSyncResponse = z.infer<typeof CalendarSyncResponseSchema>;

// ============================================================================
// CALENDAR SYNC BLOCKING SCHEMAS
// ============================================================================

/**
 * Calendar Sync Blocking Request Schema
 * Used by /api/google/calendar/sync-blocking endpoint
 */
export const CalendarSyncBlockingRequestSchema = z.object({
  // Sync preferences (from Phase 3)
  preferences: z
    .object({
      calendarIds: z.array(z.string()).optional(),
      calendarIncludeOrganizerSelf: z.boolean().optional(),
      calendarIncludePrivate: z.boolean().optional(),
      calendarTimeWindowDays: z.number().int().min(1).max(730).optional(),
      calendarFutureDays: z.number().int().min(1).max(730).optional(),
    })
    .optional(),
  // Sync parameters
  daysPast: z.number().int().min(1).max(730).optional(),
  daysFuture: z.number().int().min(1).max(730).optional(),
  maxResults: z.number().int().min(10).max(2500).optional().default(2500),
});

export type CalendarSyncBlockingRequest = z.infer<typeof CalendarSyncBlockingRequestSchema>;

/**
 * Calendar Sync Blocking Response Schema
 */
export const CalendarSyncBlockingResponseSchema = z.object({
  sessionId: z.string(),
  message: z.string(),
  stats: z.object({
    syncedEvents: z.number(),
    processedJobs: z.number(),
    daysPast: z.number(),
    daysFuture: z.number(),
    maxResults: z.number(),
    batchId: z.string(),
  }),
  partialFailure: z.boolean(),
});

export type CalendarSyncBlockingResponse = z.infer<typeof CalendarSyncBlockingResponseSchema>;

// ============================================================================
// CALENDAR IMPORT SCHEMAS
// ============================================================================

/**
 * Calendar Import Request Schema
 * Used by /api/google/calendar/import endpoint
 */
export const CalendarImportRequestSchema = z.object({
  calendarIds: z.array(z.string().min(1)).optional(),
  daysPast: z.number().int().min(0).max(365).optional(),
  daysFuture: z.number().int().min(0).max(365).optional(),
});

export type CalendarImportRequest = z.infer<typeof CalendarImportRequestSchema>;

// ============================================================================
// CALENDAR STATUS SCHEMAS
// ============================================================================

/**
 * Calendar Status Response Schema
 * Used by deprecated /api/google/calendar/status endpoint
 */
export const CalendarStatusResponseSchema = z.object({
  isConnected: z.boolean(),
  lastSyncTime: z.string().nullable(),
  totalEvents: z.number(),
  recentErrorCount: z.number(),
  reason: z.enum(['connected', 'no_integration', 'token_expired']).optional(),
  expiryDate: z.string().nullable().optional(),
  hasRefreshToken: z.boolean().optional(),
  autoRefreshed: z.boolean().optional(),
  service: z.string().optional(),
});

export type CalendarStatusResponse = z.infer<typeof CalendarStatusResponseSchema>;

// ============================================================================
// CALENDAR EVENTS SCHEMAS
// ============================================================================

/**
 * Calendar Events Query Schema (for GET requests)
 * Used by /api/google/calendar/events endpoint
 */
export const CalendarEventsQuerySchema = z.object({
  // Optional query parameters for filtering
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export type CalendarEventsQuery = z.infer<typeof CalendarEventsQuerySchema>;

/**
 * Calendar Events Response Schema
 */
export const CalendarEventsResponseSchema = z.object({
  events: z.array(z.object({
    id: z.string().uuid(),
    googleEventId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    startTime: z.string(),
    endTime: z.string(),
    attendees: z.record(z.unknown()).nullable(),
    location: z.string().nullable(),
    status: z.string().nullable(),
    eventType: z.string().nullable(),
    businessCategory: z.string().nullable(),
  })),
  total: z.number(),
});

export type CalendarEventsResponse = z.infer<typeof CalendarEventsResponseSchema>;

// ============================================================================
// CALENDAR LIST SCHEMAS
// ============================================================================

/**
 * Calendar List Query Schema (for GET requests)
 * Used by /api/google/calendar/list endpoint
 */
export const CalendarListQuerySchema = z.object({
  // Optional query parameters
  includeHidden: z.coerce.boolean().optional().default(false),
});

export type CalendarListQuery = z.infer<typeof CalendarListQuerySchema>;

/**
 * Calendar List Response Schema
 */
export const CalendarListResponseSchema = z.object({
  calendars: z.array(z.object({
    id: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    timeZone: z.string(),
    primary: z.boolean().optional(),
    accessRole: z.string().optional(),
    backgroundColor: z.string().optional(),
    foregroundColor: z.string().optional(),
  })),
  total: z.number(),
});

export type CalendarListResponse = z.infer<typeof CalendarListResponseSchema>;
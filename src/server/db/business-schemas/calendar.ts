/**
 * Calendar API Business Schemas
 *
 * Note: Calendar events are now stored as raw_events with provider='calendar'
 * rather than in a dedicated calendar_events table.
 *
 * This file contains API-specific schemas for calendar sync, OAuth, and business intelligence.
 */

import { z } from "zod";

// ============================================================================
// CALENDAR EVENT TYPES (from raw_events)
// ============================================================================

/**
 * Calendar Event type - represents calendar data from raw_events
 * This is the shape returned by the calendar API endpoints
 */
export type CalendarEvent = {
  id: string;
  googleEventId?: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  attendees: Array<{ email: string; name?: string; responseStatus?: string }> | null;
  location?: string | null;
  status?: string | null;
  eventType?: string | null;
  businessCategory?: string | null;
};

// ============================================================================
// CALENDAR OAUTH SCHEMAS
// ============================================================================

/**
 * Calendar OAuth Query Schema
 */
export const CalendarOAuthQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export type CalendarOAuthQuery = z.infer<typeof CalendarOAuthQuerySchema>;

// ============================================================================
// CALENDAR SYNC SCHEMAS
// ============================================================================

/**
 * Calendar Sync Request Schema
 * Used by /api/google/calendar/sync endpoint
 */
export const CalendarSyncRequestSchema = z.object({
  // Days to sync backwards from today
  daysPast: z.number().int().min(1).max(730).default(180), // 6 months default
  // Days to sync forwards from today
  daysFuture: z.number().int().min(1).max(730).default(365), // 1 year default
  // Maximum events to sync per calendar
  maxResults: z.number().int().min(10).max(2500).default(2500),
});

export type CalendarSyncRequest = z.infer<typeof CalendarSyncRequestSchema>;

/**
 * Calendar Sync Response Schema
 */
export const CalendarSyncResponseSchema = z.object({
  message: z.string(),
  stats: z.object({
    syncedEvents: z.number(),
    processedJobs: z.number().optional(),
    daysPast: z.number(),
    daysFuture: z.number(),
    maxResults: z.number(),
    batchId: z.string().optional(),
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
  maxResults: z.number().int().min(10).max(2500).default(2500),
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
  reason: z.enum(["connected", "no_integration", "token_expired"]).optional(),
  expiryDate: z.string().nullable().optional(),
  hasRefreshToken: z.boolean().optional(),
  autoRefreshed: z.boolean().optional(),
  service: z.string().optional(),
});

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
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * Calendar Events Response Schema
 */
export const CalendarEventsResponseSchema = z.object({
  events: z.array(
    z.object({
      id: z.string().uuid(),
      googleEventId: z.string().optional(),
      title: z.string(),
      description: z.string().nullable().optional(),
      startTime: z.string(),
      endTime: z.string(),
      attendees: z.array(
        z.object({
          email: z.string(),
          name: z.string().optional(),
          responseStatus: z.string().optional(),
        })
      ).nullable(),
      location: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
      eventType: z.string().nullable().optional(),
      businessCategory: z.string().nullable().optional(),
    }),
  ),
  total: z.number(),
});

// ============================================================================
// CALENDAR LIST SCHEMAS
// ============================================================================

/**
 * Calendar List Query Schema (for GET requests)
 * Used by /api/google/calendar/list endpoint
 */
export const CalendarListQuerySchema = z.object({
  // Optional query parameters
  includeHidden: z.coerce.boolean().default(false),
});

/**
 * Calendar List Response Schema
 */
export const CalendarListResponseSchema = z.object({
  calendars: z.array(
    z.object({
      id: z.string(),
      summary: z.string(),
      description: z.string().optional(),
      timeZone: z.string(),
      primary: z.boolean().optional(),
      accessRole: z.string().optional(),
      backgroundColor: z.string().optional(),
      foregroundColor: z.string().optional(),
    }),
  ),
  total: z.number(),
});

// ============================================================================
// BUSINESS INTELLIGENCE SCHEMAS (Moved from component types)
// ============================================================================

/**
 * Calendar Item Schema - Individual calendar in list
 */
export const CalendarItemSchema = z.object({
  id: z.string(),
  summary: z.string(),
  primary: z.boolean(),
  accessRole: z.string(),
});

export type CalendarItem = z.infer<typeof CalendarItemSchema>;

/**
 * Client Schema - Wellness business client management
 */
export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatar: z.string().optional(),
  totalSessions: z.number(),
  totalSpent: z.number(),
  lastSessionDate: z.string(),
  nextSessionDate: z.string().optional(),
  status: z.enum(["active", "inactive", "prospect"]),
  satisfaction: z.number().min(1).max(5), // 1-5 stars
  preferences: z
    .object({
      preferredTimes: z.array(z.string()).optional(),
      preferredServices: z.array(z.string()).optional(),
      goals: z.array(z.string()).optional(),
    })
    .optional(),
});

export type Client = z.infer<typeof ClientSchema>;

/**
 * Appointment Schema - Enhanced calendar event with business intelligence
 */
export const AppointmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  attendees: z
    .array(
      z.object({
        email: z.string(),
        name: z.string().optional(),
      }),
    )
    .optional(),
  eventType: z.string().optional(),
  businessCategory: z.string().optional(),
  description: z.string().optional(),
  clientContext: z
    .object({
      clientId: z.string().optional(),
      clientName: z.string().optional(),
      sessionNumber: z.number().optional(),
      lastSessionDate: z.string().optional(),
      totalSessions: z.number().optional(),
      notes: z.string().optional(),
      preparationNeeded: z.array(z.string()).optional(),
      estimatedRevenue: z.number().optional(),
    })
    .optional(),
  businessInsights: z
    .object({
      isHighValue: z.boolean().optional(),
      isRepeatClient: z.boolean().optional(),
      requiresPreparation: z.boolean().optional(),
      suggestedActions: z.array(z.string()).optional(),
    })
    .optional(),
});

export type Appointment = z.infer<typeof AppointmentSchema>;

/**
 * Weekly Statistics Schema - Business performance metrics
 */
export const WeeklyStatsSchema = z.object({
  totalAppointments: z.number(),
  totalRevenue: z.number(),
  totalHours: z.number(),
  busiestDay: z.string(),
  clientRetention: z.number(),
  newClients: z.number(),
  averageSessionValue: z.number(),
  avgSessionLength: z.number(),
  utilizationRate: z.number(),
});

export type WeeklyStats = z.infer<typeof WeeklyStatsSchema>;

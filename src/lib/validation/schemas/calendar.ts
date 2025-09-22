// ============================================================================
// CALENDAR EVENTS DTO SCHEMAS - Aligned with database schema
// ============================================================================

import { z } from "zod";

// ============================================================================
// CALENDAR EVENTS SCHEMAS
// ============================================================================

// Full calendar event schema (mirrors calendar_events table structure exactly)
export const CalendarEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  googleEventId: z.string(), // Google Calendar event ID
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.string().datetime(), // timestamp with timezone
  endTime: z.string().datetime(), // timestamp with timezone
  attendees: z.record(z.string(), z.unknown()).nullable(), // JSONB field - Store attendee emails/info
  location: z.string().nullable(),
  status: z.string().nullable(), // confirmed, cancelled, tentative
  createdAt: z.string().datetime(), // timestamp with timezone
  updatedAt: z.string().datetime(), // timestamp with timezone
  timeZone: z.string().nullable(),
  isAllDay: z.boolean().nullable(),
  visibility: z.string().nullable(),
  eventType: z.string().nullable(),
  businessCategory: z.string().nullable(),
  keywords: z.record(z.string(), z.unknown()).nullable(), // JSONB field - Stored as jsonb in database
  googleUpdated: z.string().datetime().nullable(),
  lastSynced: z.string().datetime().nullable(),
});

// Schema for creating new calendar events
export const CreateCalendarEventSchema = z.object({
  googleEventId: z.string().min(1, "Google event ID is required"),
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  description: z.string().max(5000, "Description too long").optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  attendees: z.unknown().optional(), // JSONB field
  location: z.string().max(500, "Location too long").optional(),
  status: z.string().optional(),
  timeZone: z.string().optional(),
  isAllDay: z.boolean().optional(),
  visibility: z.string().optional(),
  eventType: z.string().optional(),
  businessCategory: z.string().optional(),
  keywords: z.unknown().optional(), // JSONB field
  googleUpdated: z.string().datetime().optional(),
});

// Schema for updating existing calendar events
export const UpdateCalendarEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title too long").optional(),
  description: z.string().max(5000, "Description too long").nullable().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  attendees: z.unknown().nullable().optional(), // JSONB field
  location: z.string().max(500, "Location too long").nullable().optional(),
  status: z.string().nullable().optional(),
  timeZone: z.string().nullable().optional(),
  isAllDay: z.boolean().nullable().optional(),
  visibility: z.string().nullable().optional(),
  eventType: z.string().nullable().optional(),
  businessCategory: z.string().nullable().optional(),
  keywords: z.unknown().nullable().optional(), // JSONB field
  googleUpdated: z.string().datetime().nullable().optional(),
  lastSynced: z.string().datetime().nullable().optional(),
});

// Schema for calendar event queries/filters
export const CalendarEventQuerySchema = z.object({
  search: z.string().optional(), // Search in title, description, location
  status: z.string().optional(),
  eventType: z.string().optional(),
  businessCategory: z.string().optional(),
  startDate: z.string().datetime().optional(), // Filter events starting after this date
  endDate: z.string().datetime().optional(), // Filter events ending before this date
  hasAttendees: z.boolean().optional(), // Filter events with/without attendees
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(["startTime", "title", "createdAt"]).default("startTime"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================================
// CALENDAR ATTENDEE SCHEMAS
// ============================================================================

// Schema for calendar event attendees (within the JSONB attendees field)
export const CalendarAttendeeSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
  responseStatus: z.enum(["accepted", "declined", "tentative", "needsAction"]).optional(),
  organizer: z.boolean().default(false),
  optional: z.boolean().default(false),
});

// Schema for multiple attendees
export const CalendarAttendeesSchema = z.array(CalendarAttendeeSchema);

// ============================================================================
// CALENDAR SYNC SCHEMAS
// ============================================================================

// Schema for calendar sync status
export const CalendarSyncStatusSchema = z.object({
  calendarId: z.string(),
  calendarName: z.string(),
  lastSyncDate: z.string().datetime().nullable(),
  syncEnabled: z.boolean(),
  eventCount: z.number().int().min(0),
  errorCount: z.number().int().min(0),
  lastError: z.string().nullable(),
});

// Schema for calendar sync preferences
export const CalendarSyncPreferencesSchema = z.object({
  selectedCalendarIds: z.array(z.string()),
  syncPastDays: z.number().int().min(1).max(365).default(365),
  syncFutureDays: z.number().int().min(0).max(90).default(90),
  includePrivateEvents: z.boolean().default(false),
  includeOrganizerSelfEvents: z.boolean().default(true),
  autoSyncEnabled: z.boolean().default(true),
  syncFrequencyMinutes: z.number().int().min(5).max(1440).default(60), // 5 minutes to 24 hours
});

// ============================================================================
// WELLNESS CALENDAR ENHANCEMENTS
// ============================================================================

// Business categories for wellness practitioners
export const WellnessBusinessCategoryEnum = z.enum([
  "yoga_class",
  "private_session",
  "workshop",
  "retreat",
  "consultation",
  "assessment",
  "group_class",
  "training",
  "certification",
  "wellness_event",
  "community_event",
  "admin_time",
  "personal_time",
]);

// Event types for wellness businesses
export const WellnessEventTypeEnum = z.enum([
  "class",
  "appointment",
  "workshop",
  "consultation",
  "assessment",
  "event",
  "personal",
  "administrative",
]);

// Enhanced calendar event with wellness-specific categorization
export const WellnessCalendarEventSchema = CalendarEventSchema.extend({
  eventType: WellnessEventTypeEnum.nullable(),
  businessCategory: WellnessBusinessCategoryEnum.nullable(),
});

// ============================================================================
// CALENDAR ANALYTICS SCHEMAS
// ============================================================================

// Schema for calendar analytics data
export const CalendarAnalyticsSchema = z.object({
  totalEvents: z.number().int().min(0),
  eventsThisWeek: z.number().int().min(0),
  eventsThisMonth: z.number().int().min(0),
  averageEventsPerDay: z.number().min(0),
  busyHours: z.array(z.number().int().min(0).max(23)), // Hours of day (0-23)
  topEventTypes: z.array(z.object({
    eventType: z.string(),
    count: z.number().int().min(0),
  })),
  attendeeInsights: z.object({
    totalUniqueAttendees: z.number().int().min(0),
    frequentAttendees: z.array(z.object({
      email: z.string().email(),
      displayName: z.string().optional(),
      eventCount: z.number().int().min(1),
    })),
  }),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
export type CreateCalendarEvent = z.infer<typeof CreateCalendarEventSchema>;
export type UpdateCalendarEvent = z.infer<typeof UpdateCalendarEventSchema>;
export type CalendarEventQuery = z.infer<typeof CalendarEventQuerySchema>;

export type CalendarAttendee = z.infer<typeof CalendarAttendeeSchema>;
export type CalendarAttendees = z.infer<typeof CalendarAttendeesSchema>;

export type CalendarSyncStatus = z.infer<typeof CalendarSyncStatusSchema>;
export type CalendarSyncPreferences = z.infer<typeof CalendarSyncPreferencesSchema>;

export type WellnessCalendarEvent = z.infer<typeof WellnessCalendarEventSchema>;
export type WellnessBusinessCategory = z.infer<typeof WellnessBusinessCategoryEnum>;
export type WellnessEventType = z.infer<typeof WellnessEventTypeEnum>;

export type CalendarAnalytics = z.infer<typeof CalendarAnalyticsSchema>;
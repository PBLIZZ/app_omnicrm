/**
 * Raw Events JSONB Payload Business Schemas
 *
 * Defines the structure of JSONB content stored in raw_events table
 * - payload: Complete JSON data from provider (Gmail message, Calendar event, etc.)
 * - source_meta: Additional metadata from source
 *
 * These schemas are used across the application for type-safe access to raw event data.
 */

import { z } from "zod";

// ============================================================================
// GMAIL MESSAGE PAYLOAD SCHEMAS
// ============================================================================

export const GmailMessagePayloadSchema = z.object({
  id: z.string().optional(),
  threadId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  snippet: z.string().optional(),
  historyId: z.string().optional(),
  internalDate: z.string().optional(),
  payload: z
    .object({
      partId: z.string().optional(),
      mimeType: z.string().optional(),
      filename: z.string().optional(),
      headers: z
        .array(
          z.object({
            name: z.string().optional(),
            value: z.string().optional(),
          }),
        )
        .optional(),
      body: z
        .object({
          attachmentId: z.string().optional(),
          size: z.number().optional(),
          data: z.string().optional(),
        })
        .optional(),
      parts: z
        .array(
          z.object({
            partId: z.string().optional(),
            mimeType: z.string().optional(),
            filename: z.string().optional(),
            headers: z
              .array(
                z.object({
                  name: z.string().optional(),
                  value: z.string().optional(),
                }),
              )
              .optional(),
            body: z
              .object({
                attachmentId: z.string().optional(),
                size: z.number().optional(),
                data: z.string().optional(),
              })
              .optional(),
            parts: z.array(z.unknown()).optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  sizeEstimate: z.number().optional(),
  raw: z.string().optional(),
});

export type GmailMessagePayload = z.infer<typeof GmailMessagePayloadSchema>;

// ============================================================================
// CALENDAR EVENT PAYLOAD SCHEMAS
// ============================================================================

export const GoogleCalendarEventPayloadSchema = z.object({
  id: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z
    .object({
      dateTime: z.string().optional(),
      date: z.string().optional(),
      timeZone: z.string().optional(),
    })
    .optional(),
  end: z
    .object({
      dateTime: z.string().optional(),
      date: z.string().optional(),
      timeZone: z.string().optional(),
    })
    .optional(),
  attendees: z
    .array(
      z.object({
        email: z.string().optional(),
        displayName: z.string().optional(),
        responseStatus: z.enum(["accepted", "declined", "tentative", "needsAction"]).optional(),
        optional: z.boolean().optional(),
      }),
    )
    .optional(),
  creator: z
    .object({
      email: z.string().optional(),
      displayName: z.string().optional(),
    })
    .optional(),
  organizer: z
    .object({
      email: z.string().optional(),
      displayName: z.string().optional(),
    })
    .optional(),
  status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
  visibility: z.enum(["default", "public", "private", "confidential"]).optional(),
  recurrence: z.array(z.string()).optional(),
  recurringEventId: z.string().optional(),
  originalStartTime: z
    .object({
      dateTime: z.string().optional(),
      date: z.string().optional(),
      timeZone: z.string().optional(),
    })
    .optional(),
  htmlLink: z.string().url().optional(),
  hangoutLink: z.string().url().optional(),
  conferenceData: z
    .object({
      createRequest: z
        .object({
          requestId: z.string().optional(),
          conferenceSolutionKey: z
            .object({
              type: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
      entryPoints: z
        .array(
          z.object({
            entryPointType: z.string(),
            uri: z.string(),
            label: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  attachments: z
    .array(
      z.object({
        fileId: z.string().optional(),
        fileUrl: z.string().url().optional(),
        title: z.string().optional(),
        mimeType: z.string().optional(),
        iconLink: z.string().url().optional(),
      }),
    )
    .optional(),
  created: z.string().datetime().optional(),
  updated: z.string().datetime().optional(),
  iCalUID: z.string().optional(),
  sequence: z.number().int().min(0).optional(),
  transparency: z.enum(["opaque", "transparent"]).optional(),
  anyoneCanAddSelf: z.boolean().optional(),
  guestsCanInviteOthers: z.boolean().optional(),
  guestsCanModify: z.boolean().optional(),
  guestsCanSeeOtherGuests: z.boolean().optional(),
  privateCopy: z.boolean().optional(),
  locked: z.boolean().optional(),
});

export type GoogleCalendarEventPayload = z.infer<typeof GoogleCalendarEventPayloadSchema>;

// ============================================================================
// SOURCE META SCHEMAS
// ============================================================================

export const GmailSourceMetaSchema = z.object({
  from: z.string().optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  subject: z.string().optional(),
  threadId: z.string().optional(),
  messageId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  fetchedAt: z.string().optional(),
  matchedQuery: z.string().optional(),
  // Additional Gmail-specific fields
  labels: z.array(z.string()).optional(),
  queries: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  importance: z.enum(["high", "normal", "low"]).optional(),
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  isImportant: z.boolean().optional(),
  isSpam: z.boolean().optional(),
  isTrash: z.boolean().optional(),
  isSent: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  date: z.string().optional(),
  size: z.number().optional(),
});

export type GmailSourceMeta = z.infer<typeof GmailSourceMetaSchema>;

export const CalendarSourceMetaSchema = z.object({
  // Fields actually stored in source_meta by normalize processor
  attendees: z
    .array(
      z.object({
        email: z.string(),
        name: z.string().optional(),
        displayName: z.string().optional(),
        responseStatus: z.string().optional(),
      }),
    )
    .optional(),
  location: z.string().nullable().optional(),
  organizer: z
    .object({
      email: z.string(),
      displayName: z.string().optional(),
    })
    .nullable()
    .optional(),
  timeZone: z.string().nullable().optional(),
  eventStatus: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
  recurring: z.boolean().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  isAllDay: z.boolean().optional(),
  // Additional metadata fields that may be stored
  visibility: z.enum(["default", "public", "private", "confidential"]).optional(),
  googleUpdated: z.string().datetime().optional(),
  lastSyncDate: z.string().datetime().optional(),
  calendarId: z.string().optional(),
  eventId: z.string().optional(),
  recurringEventId: z.string().optional(),
});

export type CalendarSourceMeta = z.infer<typeof CalendarSourceMetaSchema>;

// ============================================================================
// UNION TYPES FOR RAW EVENTS
// ============================================================================

export const RawEventPayloadSchema = z.union([
  GmailMessagePayloadSchema,
  GoogleCalendarEventPayloadSchema,
  z.record(z.string(), z.unknown()), // Fallback for unknown payloads
]);

export type RawEventPayload = z.infer<typeof RawEventPayloadSchema>;

export const RawEventSourceMetaSchema = z.union([
  GmailSourceMetaSchema,
  CalendarSourceMetaSchema,
  z.record(z.string(), z.unknown()), // Fallback for unknown metadata
]);

export type RawEventSourceMeta = z.infer<typeof RawEventSourceMetaSchema>;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateGmailPayload(data: unknown): GmailMessagePayload {
  return GmailMessagePayloadSchema.parse(data);
}

export function validateCalendarPayload(data: unknown): GoogleCalendarEventPayload {
  return GoogleCalendarEventPayloadSchema.parse(data);
}

export function validateGmailSourceMeta(data: unknown): GmailSourceMeta {
  return GmailSourceMetaSchema.parse(data);
}

export function validateCalendarSourceMeta(data: unknown): CalendarSourceMeta {
  return CalendarSourceMetaSchema.parse(data);
}

export function safeValidateRawEventPayload(data: unknown) {
  return RawEventPayloadSchema.safeParse(data);
}

export function safeValidateRawEventSourceMeta(data: unknown) {
  return RawEventSourceMetaSchema.safeParse(data);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isGmailPayload(data: unknown): data is GmailMessagePayload {
  return GmailMessagePayloadSchema.safeParse(data).success;
}

export function isCalendarPayload(data: unknown): data is GoogleCalendarEventPayload {
  return GoogleCalendarEventPayloadSchema.safeParse(data).success;
}

export function isGmailSourceMeta(data: unknown): data is GmailSourceMeta {
  return GmailSourceMetaSchema.safeParse(data).success;
}

export function isCalendarSourceMeta(data: unknown): data is CalendarSourceMeta {
  return CalendarSourceMetaSchema.safeParse(data).success;
}

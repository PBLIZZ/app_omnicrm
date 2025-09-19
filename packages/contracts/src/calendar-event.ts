import { z } from "zod";

/**
 * Calendar Event DTO Schema
 *
 * Stable UI-focused contract for calendar event data.
 * Used for business intelligence and timeline building.
 */
export const CalendarEventDTOSchema = z.object({
  id: z.string().uuid(),
  googleEventId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  attendees: z.unknown().nullable(), // JSON array of attendee info
  location: z.string().nullable(),
  status: z.enum(["confirmed", "cancelled", "tentative"]).nullable(),
  timeZone: z.string().nullable(),
  isAllDay: z.boolean().nullable(),
  visibility: z.string().nullable(),
  eventType: z.string().nullable(),
  businessCategory: z.string().nullable(),
  keywords: z.array(z.string()).nullable(),
  googleUpdated: z.coerce.date().nullable(),
  lastSynced: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CalendarEventDTO = z.infer<typeof CalendarEventDTOSchema>;

/**
 * Contact Timeline Event DTO Schema
 *
 * Auto-generated timeline events from calendar data
 */
export const ContactTimelineDTOSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
  eventType: z.enum([
    "class_attended",
    "workshop_booked",
    "appointment_scheduled",
    "session_completed",
    "event_attended"
  ]),
  title: z.string(),
  description: z.string().nullable(),
  eventData: z.unknown(), // JSON blob with eventId, eventTitle, location, duration, etc.
  occurredAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export type ContactTimelineDTO = z.infer<typeof ContactTimelineDTOSchema>;

/**
 * Create Calendar Event DTO Schema
 *
 * Schema for creating calendar events
 */
export const CreateCalendarEventDTOSchema = z.object({
  googleEventId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  attendees: z.unknown().optional(),
  location: z.string().optional(),
  status: z.enum(["confirmed", "cancelled", "tentative"]).optional(),
  timeZone: z.string().optional(),
  isAllDay: z.boolean().optional(),
  visibility: z.string().optional(),
  eventType: z.string().optional(),
  businessCategory: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  googleUpdated: z.coerce.date().optional(),
});

export type CreateCalendarEventDTO = z.infer<typeof CreateCalendarEventDTOSchema>;

/**
 * Update Calendar Event DTO Schema
 *
 * Schema for updating calendar events (all fields optional)
 */
export const UpdateCalendarEventDTOSchema = CreateCalendarEventDTOSchema.partial();

export type UpdateCalendarEventDTO = z.infer<typeof UpdateCalendarEventDTOSchema>;

/**
 * Calendar Event Filters Schema
 *
 * Schema for filtering calendar events
 */
export const CalendarEventFiltersSchema = z.object({
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  eventType: z.string().optional(),
  businessCategory: z.string().optional(),
  status: z.enum(["confirmed", "cancelled", "tentative"]).optional(),
});

export type CalendarEventFilters = z.infer<typeof CalendarEventFiltersSchema>;
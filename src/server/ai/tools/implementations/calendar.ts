/**
 * Calendar & Scheduling Tools
 *
 * AI-callable tools for calendar event management in the wellness CRM.
 * Implements calendar operations for session scheduling, appointments, and event management.
 * Events are stored in the interactions table with type='calendar_event'.
 */

import type { ToolDefinition, ToolHandler } from "../types";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { createCalendarRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";

// ============================================================================
// TOOL 1: get_upcoming_sessions
// ============================================================================

const GetUpcomingSessionsParamsSchema = z.object({
  days_ahead: z.number().int().positive().max(365).default(7),
  contact_id: z.string().uuid().optional(),
  event_type: z.string().optional(),
});

type GetUpcomingSessionsParams = z.infer<typeof GetUpcomingSessionsParamsSchema>;

export const getUpcomingSessionsDefinition: ToolDefinition = {
  name: "get_upcoming_sessions",
  category: "data_access",
  version: "1.0.0",
  description:
    "Retrieve upcoming calendar events/sessions within the next N days. Returns scheduled appointments, sessions, and meetings with details including time, contact, location, and attendees.",
  useCases: [
    "When user asks 'what sessions do I have coming up?'",
    "When user wants to 'show my schedule for this week'",
    "When preparing for upcoming appointments",
    "When checking 'when is my next session with [contact name]?'",
  ],
  exampleCalls: [
    'get_upcoming_sessions({"days_ahead": 7})',
    'get_upcoming_sessions({"days_ahead": 3, "contact_id": "uuid", "event_type": "yoga"})',
    'User: "What\'s on my schedule today?" → LLM calls get_upcoming_sessions with days_ahead=1',
  ],
  parameters: {
    type: "object",
    properties: {
      days_ahead: {
        type: "number",
        description: "Number of days to look ahead (default: 7, max: 365)",
      },
      contact_id: {
        type: "string",
        description: "Optional: Filter events for specific contact (UUID)",
      },
      event_type: {
        type: "string",
        description: "Optional: Filter by event type (e.g., 'yoga', 'massage', 'consultation')",
      },
    },
    required: [],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 60, // 1 minute - calendar changes frequently
  tags: ["calendar", "scheduling", "read"],
  deprecated: false,
};

export const getUpcomingSessionsHandler: ToolHandler<GetUpcomingSessionsParams> = async (
  params,
  context,
) => {
  const validated = GetUpcomingSessionsParamsSchema.parse(params);
  const db = await getDb();
  const repo = createCalendarRepository(db);

  const events = await repo.getUpcomingSessions(
    context.userId,
    validated.days_ahead,
    validated.contact_id,
    validated.event_type,
  );

  return events;
};

// ============================================================================
// TOOL 2: get_event
// ============================================================================

const GetEventParamsSchema = z.object({
  event_id: z.string().uuid(),
});

type GetEventParams = z.infer<typeof GetEventParamsSchema>;

export const getEventDefinition: ToolDefinition = {
  name: "get_event",
  category: "data_access",
  version: "1.0.0",
  description:
    "Retrieve complete details for a specific calendar event by its ID. Returns event information including title, time, location, description, contact, and attendees.",
  useCases: [
    "When user asks 'show me details for this event'",
    "When reviewing specific appointment information",
    "When preparing for a session and need full event context",
    "When verifying event details before making changes",
  ],
  exampleCalls: [
    'get_event({"event_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'User: "What are the details for my 2pm appointment?" → LLM finds event ID and calls get_event',
  ],
  parameters: {
    type: "object",
    properties: {
      event_id: {
        type: "string",
        description: "UUID of the calendar event to retrieve",
      },
    },
    required: ["event_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300, // 5 minutes
  tags: ["calendar", "scheduling", "read"],
  deprecated: false,
};

export const getEventHandler: ToolHandler<GetEventParams> = async (params, context) => {
  const validated = GetEventParamsSchema.parse(params);
  const db = await getDb();
  const repo = createCalendarRepository(db);

  const event = await repo.getEventById(context.userId, validated.event_id);

  if (!event) {
    throw new AppError(
      `Calendar event with ID ${validated.event_id} not found`,
      "EVENT_NOT_FOUND",
      "database",
      true,
      404,
    );
  }

  return event;
};

// ============================================================================
// TOOL 3: create_event
// ============================================================================

const CreateEventParamsSchema = z.object({
  title: z.string().min(1).max(500),
  start_time: z.string().datetime(), // ISO 8601 datetime string
  end_time: z.string().datetime(), // ISO 8601 datetime string
  contact_id: z.string().uuid(), // Required - calendar events must be associated with a contact
  location: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  event_type: z.string().max(100).optional(),
  attendees: z.array(z.string().email()).optional(),
});

type CreateEventParams = z.infer<typeof CreateEventParamsSchema>;

export const createEventDefinition: ToolDefinition = {
  name: "create_event",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Create a new calendar event/session/appointment. Schedules a new event with specified date, time, contact, location, and other details. Validates that end time is after start time.",
  useCases: [
    "When user asks 'schedule a session with Sarah next Tuesday at 2pm'",
    "When user wants to 'book an appointment for Friday'",
    "When creating follow-up sessions",
    "When scheduling consultations or meetings",
  ],
  exampleCalls: [
    'create_event({"title": "Yoga Session", "start_time": "2025-01-15T14:00:00Z", "end_time": "2025-01-15T15:00:00Z", "contact_id": "uuid", "location": "Studio A", "event_type": "yoga"})',
    'User: "Schedule follow-up with John next Monday at 10am for 1 hour" → LLM calls create_event',
  ],
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Event title/subject (required, max 500 chars)",
      },
      start_time: {
        type: "string",
        description: "Event start time in ISO 8601 format (e.g., '2025-01-15T14:00:00Z')",
      },
      end_time: {
        type: "string",
        description: "Event end time in ISO 8601 format (must be after start_time)",
      },
      contact_id: {
        type: "string",
        description: "UUID of contact/client for this event (required)",
      },
      location: {
        type: "string",
        description: "Optional: Event location (max 500 chars)",
      },
      description: {
        type: "string",
        description: "Optional: Event description/notes (max 5000 chars)",
      },
      event_type: {
        type: "string",
        description:
          "Optional: Type of event (e.g., 'yoga', 'massage', 'consultation', 'meeting')",
      },
      attendees: {
        type: "array",
        items: { type: "string" },
        description: "Optional: Array of attendee email addresses",
      },
    },
    required: ["title", "start_time", "end_time", "contact_id"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: false,
  cacheable: false,
  rateLimit: {
    maxCalls: 50,
    windowMs: 60000, // 50 events per minute
  },
  tags: ["calendar", "scheduling", "write", "create"],
  deprecated: false,
};

export const createEventHandler: ToolHandler<CreateEventParams> = async (params, context) => {
  const validated = CreateEventParamsSchema.parse(params);
  const db = await getDb();
  const repo = createCalendarRepository(db);

  // Parse and validate dates
  const startTime = new Date(validated.start_time);
  const endTime = new Date(validated.end_time);

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    throw new AppError(
      "Invalid date format. Use ISO 8601 format (e.g., '2025-01-15T14:00:00Z')",
      "INVALID_DATE_FORMAT",
      "validation",
      true,
      400,
    );
  }

  if (endTime <= startTime) {
    throw new AppError(
      "Event end time must be after start time",
      "INVALID_TIME_RANGE",
      "validation",
      true,
      400,
    );
  }

  try {
    const eventData: {
      title: string;
      startTime: Date;
      endTime: Date;
      contactId?: string;
      location?: string;
      description?: string;
      eventType?: string;
      attendees?: string[];
    } = {
      title: validated.title,
      startTime,
      endTime,
    };

    if (validated.contact_id !== undefined) {
      eventData.contactId = validated.contact_id;
    }
    if (validated.location !== undefined) {
      eventData.location = validated.location;
    }
    if (validated.description !== undefined) {
      eventData.description = validated.description;
    }
    if (validated.event_type !== undefined) {
      eventData.eventType = validated.event_type;
    }
    if (validated.attendees !== undefined) {
      eventData.attendees = validated.attendees;
    }

    const event = await repo.createEvent(context.userId, eventData);

    return event;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create calendar event",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 4: update_event
// ============================================================================

const UpdateEventParamsSchema = z.object({
  event_id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  location: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
});

type UpdateEventParams = z.infer<typeof UpdateEventParamsSchema>;

export const updateEventDefinition: ToolDefinition = {
  name: "update_event",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Update an existing calendar event's details. Can modify title, time, location, or description. Validates that updated end time is after start time.",
  useCases: [
    "When user asks 'reschedule my session with Sarah to 3pm'",
    "When user wants to 'change the location for tomorrow's appointment'",
    "When updating event details or notes",
    "When moving appointments to different time slots",
  ],
  exampleCalls: [
    'update_event({"event_id": "uuid", "start_time": "2025-01-15T15:00:00Z", "end_time": "2025-01-15T16:00:00Z"})',
    'update_event({"event_id": "uuid", "location": "Studio B", "description": "Updated notes"})',
    'User: "Move my 2pm session to 4pm" → LLM finds event ID and calls update_event',
  ],
  parameters: {
    type: "object",
    properties: {
      event_id: {
        type: "string",
        description: "UUID of the event to update (required)",
      },
      title: {
        type: "string",
        description: "Optional: New event title (max 500 chars)",
      },
      start_time: {
        type: "string",
        description: "Optional: New start time in ISO 8601 format",
      },
      end_time: {
        type: "string",
        description: "Optional: New end time in ISO 8601 format",
      },
      location: {
        type: "string",
        description: "Optional: New location (max 500 chars)",
      },
      description: {
        type: "string",
        description: "Optional: New description/notes (max 5000 chars)",
      },
    },
    required: ["event_id"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  tags: ["calendar", "scheduling", "write", "update"],
  deprecated: false,
};

export const updateEventHandler: ToolHandler<UpdateEventParams> = async (params, context) => {
  const validated = UpdateEventParamsSchema.parse(params);
  const db = await getDb();
  const repo = createCalendarRepository(db);

  // Parse dates if provided
  const updates: {
    title?: string;
    startTime?: Date;
    endTime?: Date;
    location?: string;
    description?: string;
  } = {};

  if (validated.title !== undefined) {
    updates.title = validated.title;
  }

  if (validated.start_time !== undefined) {
    const startTime = new Date(validated.start_time);
    if (isNaN(startTime.getTime())) {
      throw new AppError(
        "Invalid start_time format. Use ISO 8601 format (e.g., '2025-01-15T14:00:00Z')",
        "INVALID_DATE_FORMAT",
        "validation",
        true,
        400,
      );
    }
    updates.startTime = startTime;
  }

  if (validated.end_time !== undefined) {
    const endTime = new Date(validated.end_time);
    if (isNaN(endTime.getTime())) {
      throw new AppError(
        "Invalid end_time format. Use ISO 8601 format (e.g., '2025-01-15T15:00:00Z')",
        "INVALID_DATE_FORMAT",
        "validation",
        true,
        400,
      );
    }
    updates.endTime = endTime;
  }

  if (validated.location !== undefined) {
    updates.location = validated.location;
  }

  if (validated.description !== undefined) {
    updates.description = validated.description;
  }

  try {
    const event = await repo.updateEvent(context.userId, validated.event_id, updates);

    if (!event) {
      throw new AppError(
        `Calendar event with ID ${validated.event_id} not found`,
        "EVENT_NOT_FOUND",
        "database",
        true,
        404,
      );
    }

    return event;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to update calendar event",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 5: delete_event
// ============================================================================

const DeleteEventParamsSchema = z.object({
  event_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

type DeleteEventParams = z.infer<typeof DeleteEventParamsSchema>;

export const deleteEventDefinition: ToolDefinition = {
  name: "delete_event",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Delete (cancel) a calendar event. This is a destructive operation that permanently removes the event. Requires admin permission level.",
  useCases: [
    "When user asks 'cancel my appointment with Sarah'",
    "When user wants to 'delete tomorrow's session'",
    "When removing no-show appointments",
    "When cleaning up past or duplicate events",
  ],
  exampleCalls: [
    'delete_event({"event_id": "uuid"})',
    'delete_event({"event_id": "uuid", "reason": "Client requested cancellation"})',
    'User: "Cancel my session tomorrow" → LLM finds event ID and calls delete_event',
  ],
  parameters: {
    type: "object",
    properties: {
      event_id: {
        type: "string",
        description: "UUID of the event to delete (required)",
      },
      reason: {
        type: "string",
        description: "Optional: Reason for cancellation (max 500 chars, for logging purposes)",
      },
    },
    required: ["event_id"],
    additionalProperties: false,
  },
  permissionLevel: "admin", // Destructive operation
  creditCost: 0,
  isIdempotent: true, // Safe to call multiple times
  cacheable: false,
  tags: ["calendar", "scheduling", "delete", "admin"],
  deprecated: false,
};

export const deleteEventHandler: ToolHandler<DeleteEventParams> = async (params, context) => {
  const validated = DeleteEventParamsSchema.parse(params);
  const db = await getDb();
  const repo = createCalendarRepository(db);

  try {
    const deleted = await repo.deleteEvent(context.userId, validated.event_id);

    if (!deleted) {
      throw new AppError(
        `Calendar event with ID ${validated.event_id} not found`,
        "EVENT_NOT_FOUND",
        "database",
        true,
        404,
      );
    }

    return {
      success: true,
      event_id: validated.event_id,
      message: "Calendar event deleted successfully",
      reason: validated.reason,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete calendar event",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 6: check_availability
// ============================================================================

const CheckAvailabilityParamsSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  duration_minutes: z.number().int().positive().max(480), // Max 8 hours
  timezone: z.string().optional(),
});

type CheckAvailabilityParams = z.infer<typeof CheckAvailabilityParamsSchema>;

export const checkAvailabilityDefinition: ToolDefinition = {
  name: "check_availability",
  category: "data_access",
  version: "1.0.0",
  description:
    "Find available time slots within a date range for a given duration. Returns free slots during working hours (9am-5pm) that don't conflict with existing calendar events. Useful for scheduling new appointments.",
  useCases: [
    "When user asks 'when am I free this week?'",
    "When scheduling: 'find a 60-minute slot on Thursday'",
    "When planning: 'show me available times for a 90-minute session next week'",
    "Before booking: 'do I have any free time Friday afternoon?'",
  ],
  exampleCalls: [
    'check_availability({"start_date": "2025-10-29T00:00:00Z", "end_date": "2025-11-02T00:00:00Z", "duration_minutes": 60})',
    'User: "When am I free Thursday for a 60-minute session?" → check_availability({...})',
  ],
  parameters: {
    type: "object",
    properties: {
      start_date: {
        type: "string",
        description: "Start of date range in ISO 8601 format",
      },
      end_date: {
        type: "string",
        description: "End of date range in ISO 8601 format",
      },
      duration_minutes: {
        type: "number",
        description: "Required duration in minutes (max 480 = 8 hours)",
      },
      timezone: {
        type: "string",
        description: "Optional: timezone for working hours (e.g., 'America/New_York')",
      },
    },
    required: ["start_date", "end_date", "duration_minutes"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 180, // 3 minutes
  tags: ["calendar", "scheduling", "read", "availability"],
  deprecated: false,
};

export const checkAvailabilityHandler: ToolHandler<CheckAvailabilityParams> = async (
  params,
  context,
) => {
  const validated = CheckAvailabilityParamsSchema.parse(params);
  const db = await getDb();
  const repo = createCalendarRepository(db);

  const startDate = new Date(validated.start_date);
  const endDate = new Date(validated.end_date);

  if (endDate <= startDate) {
    throw new AppError(
      "End date must be after start date",
      "INVALID_DATE_RANGE",
      "validation",
      true,
      400,
    );
  }

  try {
    const availabilityParams: {
      startDate: Date;
      endDate: Date;
      durationMinutes: number;
      timezone?: string;
    } = {
      startDate,
      endDate,
      durationMinutes: validated.duration_minutes,
    };

    if (validated.timezone !== undefined) {
      availabilityParams.timezone = validated.timezone;
    }

    const availableSlots = await repo.findAvailability(context.userId, availabilityParams);

    return {
      slots: availableSlots,
      totalSlots: availableSlots.length,
      requestedDuration: validated.duration_minutes,
      dateRange: {
        start: validated.start_date,
        end: validated.end_date,
      },
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to check availability",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 7: add_event_attendee
// ============================================================================

const AddEventAttendeeParamsSchema = z.object({
  event_id: z.string().uuid(),
  contact_id: z.string().uuid(),
});

type AddEventAttendeeParams = z.infer<typeof AddEventAttendeeParamsSchema>;

export const addEventAttendeeDefinition: ToolDefinition = {
  name: "add_event_attendee",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Add a contact as an attendee to a calendar event. Updates the event's attendee list with the contact's email and name. Useful for group sessions or workshops.",
  useCases: [
    "When user asks to 'add Sarah to Thursday's group class'",
    "When booking multiple clients: 'include John in the workshop'",
    "When managing group sessions: 'add these three clients to the retreat'",
    "When updating event: 'make this a joint session with both clients'",
  ],
  exampleCalls: [
    'add_event_attendee({"event_id": "...", "contact_id": "..."})',
    'User: "Add Sarah to the group yoga class" → add_event_attendee({...})',
  ],
  parameters: {
    type: "object",
    properties: {
      event_id: {
        type: "string",
        description: "UUID of the calendar event",
      },
      contact_id: {
        type: "string",
        description: "UUID of the contact to add as attendee",
      },
    },
    required: ["event_id", "contact_id"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  rateLimit: {
    maxCalls: 100,
    windowMs: 60000,
  },
  tags: ["calendar", "scheduling", "write", "attendees"],
  deprecated: false,
};

export const addEventAttendeeHandler: ToolHandler<AddEventAttendeeParams> = async (
  params,
  context,
) => {
  const validated = AddEventAttendeeParamsSchema.parse(params);
  const db = await getDb();
  const repo = createCalendarRepository(db);

  try {
    const updatedEvent = await repo.addEventAttendee(
      context.userId,
      validated.event_id,
      validated.contact_id,
    );

    if (!updatedEvent) {
      throw new AppError(
        `Event or contact not found`,
        "RESOURCE_NOT_FOUND",
        "database",
        true,
        404,
      );
    }

    return updatedEvent;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to add event attendee",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 8: remove_event_attendee
// ============================================================================

const RemoveEventAttendeeParamsSchema = z.object({
  event_id: z.string().uuid(),
  contact_id: z.string().uuid(),
});

type RemoveEventAttendeeParams = z.infer<typeof RemoveEventAttendeeParamsSchema>;

export const removeEventAttendeeDefinition: ToolDefinition = {
  name: "remove_event_attendee",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Remove a contact from a calendar event's attendee list. Updates the event to exclude the specified contact. Useful when clients cancel or event capacity changes.",
  useCases: [
    "When user asks to 'remove John from tomorrow's class'",
    "When client cancels: 'take Sarah off the workshop attendee list'",
    "When managing capacity: 'remove these clients from the full session'",
    "When correcting mistakes: 'I added the wrong person to that event'",
  ],
  exampleCalls: [
    'remove_event_attendee({"event_id": "...", "contact_id": "..."})',
    'User: "Remove John from the group session" → remove_event_attendee({...})',
  ],
  parameters: {
    type: "object",
    properties: {
      event_id: {
        type: "string",
        description: "UUID of the calendar event",
      },
      contact_id: {
        type: "string",
        description: "UUID of the contact to remove from attendees",
      },
    },
    required: ["event_id", "contact_id"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  rateLimit: {
    maxCalls: 100,
    windowMs: 60000,
  },
  tags: ["calendar", "scheduling", "write", "attendees"],
  deprecated: false,
};

export const removeEventAttendeeHandler: ToolHandler<RemoveEventAttendeeParams> = async (
  params,
  context,
) => {
  const validated = RemoveEventAttendeeParamsSchema.parse(params);
  const db = await getDb();
  const repo = createCalendarRepository(db);

  try {
    const updatedEvent = await repo.removeEventAttendee(
      context.userId,
      validated.event_id,
      validated.contact_id,
    );

    if (!updatedEvent) {
      throw new AppError(
        `Event or contact not found`,
        "RESOURCE_NOT_FOUND",
        "database",
        true,
        404,
      );
    }

    return updatedEvent;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to remove event attendee",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 9: get_session_prep
// ============================================================================

const GetSessionPrepParamsSchema = z.object({
  event_id: z.string().uuid(),
});

type GetSessionPrepParams = z.infer<typeof GetSessionPrepParamsSchema>;

export const getSessionPrepDefinition: ToolDefinition = {
  name: "get_session_prep",
  category: "data_access",
  version: "1.0.0",
  description:
    "Get comprehensive preparation data for an upcoming session. Returns event details plus associated contact info, recent notes (last 5), pending tasks (up to 10), and related goals (up to 5). Perfect for pre-session briefing and context.",
  useCases: [
    "When user asks 'prepare me for my next session'",
    "Before meeting: 'show me context for Sarah's appointment tomorrow'",
    "When planning: 'what should I know before meeting with John?'",
    "Morning routine: 'brief me on today's first client session'",
  ],
  exampleCalls: [
    'get_session_prep({"event_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'User: "Prepare me for tomorrow\'s 2pm session" → get_session_prep({...})',
  ],
  parameters: {
    type: "object",
    properties: {
      event_id: {
        type: "string",
        description: "UUID of the event/session to prepare for",
      },
    },
    required: ["event_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300,
  tags: ["calendar", "scheduling", "read", "session-prep", "context"],
  deprecated: false,
};

export const getSessionPrepHandler: ToolHandler<GetSessionPrepParams> = async (
  params,
  context,
) => {
  const validated = GetSessionPrepParamsSchema.parse(params);
  const db = await getDb();
  const repo = createCalendarRepository(db);

  try {
    const prepData = await repo.getSessionPrep(context.userId, validated.event_id);

    if (!prepData) {
      throw new AppError(
        `Event with ID ${validated.event_id} not found`,
        "EVENT_NOT_FOUND",
        "database",
        true,
        404,
      );
    }

    return prepData;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get session preparation data",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 10: search_events
// ============================================================================

const SearchEventsParamsSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  contact_id: z.string().uuid().optional(),
  event_type: z.string().optional(),
  query: z.string().max(200).optional(),
  limit: z.number().int().positive().max(100).default(50),
});

type SearchEventsParams = z.infer<typeof SearchEventsParamsSchema>;

export const searchEventsDefinition: ToolDefinition = {
  name: "search_events",
  category: "data_access",
  version: "1.0.0",
  description:
    "Search calendar events with flexible filters. Can filter by date range, contact, event type, or text query in title/description. Returns matching events sorted by date. Useful for analytics and reporting.",
  useCases: [
    "When user asks 'show me all yoga classes this month'",
    "When reviewing history: 'find all sessions with Sarah in October'",
    "When searching: 'show me events with massage in the title'",
    "When analyzing: 'how many consultations did I have last week?'",
  ],
  exampleCalls: [
    'search_events({"event_type": "yoga", "start_date": "2025-10-01T00:00:00Z", "end_date": "2025-10-31T23:59:59Z"})',
    'search_events({"contact_id": "...", "limit": 20})',
    'User: "Show me all massage sessions this month" → search_events({...})',
  ],
  parameters: {
    type: "object",
    properties: {
      start_date: {
        type: "string",
        description: "Optional: filter events starting from this date (ISO 8601)",
      },
      end_date: {
        type: "string",
        description: "Optional: filter events until this date (ISO 8601)",
      },
      contact_id: {
        type: "string",
        description: "Optional: filter by specific contact UUID",
      },
      event_type: {
        type: "string",
        description: "Optional: filter by event type (yoga, massage, consultation, etc.)",
      },
      query: {
        type: "string",
        description: "Optional: text search in event title/description",
      },
      limit: {
        type: "number",
        description: "Maximum number of events to return (default 50, max 100)",
      },
    },
    required: [],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 180,
  tags: ["calendar", "scheduling", "read", "search"],
  deprecated: false,
};

export const searchEventsHandler: ToolHandler<SearchEventsParams> = async (params, context) => {
  const validated = SearchEventsParamsSchema.parse(params);
  const db = await getDb();
  const repo = createCalendarRepository(db);

  const searchParams: {
    startDate?: Date;
    endDate?: Date;
    contactId?: string;
    eventType?: string;
    query?: string;
    limit?: number;
  } = {
    limit: validated.limit,
  };

  if (validated.start_date) searchParams.startDate = new Date(validated.start_date);
  if (validated.end_date) searchParams.endDate = new Date(validated.end_date);
  if (validated.contact_id) searchParams.contactId = validated.contact_id;
  if (validated.event_type) searchParams.eventType = validated.event_type;
  if (validated.query) searchParams.query = validated.query;

  try {
    const events = await repo.searchEvents(context.userId, searchParams);

    return {
      events,
      totalResults: events.length,
      filters: {
        startDate: validated.start_date,
        endDate: validated.end_date,
        contactId: validated.contact_id,
        eventType: validated.event_type,
        query: validated.query,
      },
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to search events",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
};

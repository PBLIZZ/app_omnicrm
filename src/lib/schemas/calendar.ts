// Calendar preview/approve/undo payload schemas
// Data types sourced from server/db/schema.ts (canonical database schema)
// No manual types created - all types inferred from zod schemas

import { z } from "zod";

// Calendar preview request (for api/sync/preview/calendar)
export const CalendarPreviewSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    includePrivate: z.boolean().optional(),
  })
  .strict();
export type CalendarPreview = z.infer<typeof CalendarPreviewSchema>;

// Calendar approve request (for api/sync/approve/calendar)
export const CalendarApproveSchema = z
  .object({
    batchId: z.string().uuid(),
  })
  .strict();
export type CalendarApprove = z.infer<typeof CalendarApproveSchema>;

// Calendar undo request (for api/sync/undo)
export const CalendarUndoSchema = z
  .object({
    batchId: z.string().uuid(),
  })
  .strict();
export type CalendarUndo = z.infer<typeof CalendarUndoSchema>;

// Calendar event preview item (response from preview endpoint)
export const CalendarEventPreviewSchema = z.object({
  id: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  start: z.object({
    dateTime: z.string().datetime().optional(),
    date: z.string().optional(), // For all-day events
  }),
  end: z.object({
    dateTime: z.string().datetime().optional(),
    date: z.string().optional(), // For all-day events
  }),
  attendees: z
    .array(
      z.object({
        email: z.string().email(),
        displayName: z.string().optional(),
        responseStatus: z.enum(["needsAction", "declined", "tentative", "accepted"]).optional(),
      }),
    )
    .optional(),
  organizer: z
    .object({
      email: z.string().email(),
      displayName: z.string().optional(),
    })
    .optional(),
  location: z.string().optional(),
  visibility: z.enum(["default", "public", "private", "confidential"]).default("default"),
});

export const CalendarPreviewResponseSchema = z.object({
  events: z.array(CalendarEventPreviewSchema),
  stats: z.object({
    totalEvents: z.number().int().min(0),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
    organizedBySelf: z.number().int().min(0),
    privateEvents: z.number().int().min(0),
  }),
  batchId: z.string().uuid(),
});

export type CalendarEventPreview = z.infer<typeof CalendarEventPreviewSchema>;
export type CalendarPreviewResponse = z.infer<typeof CalendarPreviewResponseSchema>;

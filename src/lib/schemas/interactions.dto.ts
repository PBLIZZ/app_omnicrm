import { z } from 'zod';

// Mirror the interactions table structure with Zod validation
export const InteractionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  type: z.string(),
  subject: z.string().nullable(),
  bodyText: z.string().nullable(),
  bodyRaw: z.unknown().nullable(),
  occurredAt: z.string().datetime(), // ISO string
  source: z.string().nullable(),
  sourceId: z.string().nullable(),
  sourceMeta: z.record(z.string(), z.unknown()).nullable(),
  batchId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const NewInteractionSchema = InteractionSchema.omit({
  id: true,
  createdAt: true,
});

export const NormalizedInteractionSchema = z.object({
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable().optional(),
  type: z.string(),
  subject: z.string().nullable().optional(),
  bodyText: z.string().nullable().optional(),
  bodyRaw: z.unknown().nullable().optional(),
  occurredAt: z.string().datetime(), // ISO string
  source: z.string(),
  sourceId: z.string().optional(),
  sourceMeta: z.record(z.string(), z.unknown()).nullable().optional(),
  batchId: z.string().uuid().nullable().optional(),
});

// Interaction types enum
export const InteractionType = {
  EMAIL_RECEIVED: 'email_received',
  EMAIL_SENT: 'email_sent',
  SMS_RECEIVED: 'sms_received', 
  SMS_SENT: 'sms_sent',
  DM_RECEIVED: 'dm_received',
  DM_SENT: 'dm_sent',
  MEETING_CREATED: 'meeting_created',
  MEETING_ATTENDED: 'meeting_attended',
  CALL_LOGGED: 'call_logged',
  NOTE_ADDED: 'note_added',
  FORM_SUBMISSION: 'form_submission',
  WEB_CHAT: 'web_chat',
  SYSTEM_EVENT: 'system_event',
} as const;

export type Interaction = z.infer<typeof InteractionSchema>;
export type NewInteraction = z.infer<typeof NewInteractionSchema>;
export type NormalizedInteraction = z.infer<typeof NormalizedInteractionSchema>;
export type InteractionType = typeof InteractionType[keyof typeof InteractionType];
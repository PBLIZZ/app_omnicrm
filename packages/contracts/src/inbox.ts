/**
 * Inbox DTOs and Validation Schemas
 *
 * The AI-powered inbox where wellness practitioners can "dump everything"
 * and let AI automatically categorize, prioritize, and route tasks.
 */

import { z } from "zod";

// Inbox item status enum
export const InboxItemStatusSchema = z.enum(["unprocessed", "processed", "archived"]);

// Base Inbox Item Schema - matches the database structure
export const InboxItemDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  rawText: z.string().min(1, "Inbox text cannot be empty"),
  status: InboxItemStatusSchema,
  createdTaskId: z.string().uuid().nullable(),
  processedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create Inbox Item Schema - for quick capture
export const CreateInboxItemDTOSchema = z.object({
  rawText: z
    .string()
    .min(1, "Please enter some text")
    .max(2000, "Text too long (max 2000 characters)"),
});

// Update Inbox Item Schema - for manual status changes
export const UpdateInboxItemDTOSchema = z.object({
  status: InboxItemStatusSchema.optional(),
  createdTaskId: z.string().uuid().optional(),
});

// Shared User Context Schema - for AI processing context
export const userContextSchema = z
  .object({
    currentEnergy: z.number().min(1).max(5).optional(), // From daily pulse
    availableTime: z.number().optional(), // Minutes available
    preferences: z
      .object({
        preferredZone: z.string().optional(),
        workingHours: z
          .object({
            start: z
              .string()
              .regex(
                /^(?:[01]\d|2[0-3]):[0-5]\d$/,
                "Invalid time format. Use HH:MM (24-hour format)",
              )
              .optional(),
            end: z
              .string()
              .regex(
                /^(?:[01]\d|2[0-3]):[0-5]\d$/,
                "Invalid time format. Use HH:MM (24-hour format)",
              )
              .optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .optional();

// AI Processing Request Schema - for triggering AI categorization
export const ProcessInboxItemDTOSchema = z.object({
  id: z.string().uuid(),
  userContext: userContextSchema,
});

// AI Processing Result Schema - response from AI categorization
export const InboxProcessingResultDTOSchema = z.object({
  suggestedZone: z.string(),
  suggestedPriority: z.enum(["low", "medium", "high", "urgent"]),
  suggestedProject: z.string().optional(),
  extractedTasks: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      estimatedMinutes: z.number().optional(),
      dueDate: z.date().optional(),
    }),
  ),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

// Inbox Item with AI suggestions - for UI display
export const InboxItemWithSuggestionsDTOSchema = InboxItemDTOSchema.extend({
  aiSuggestions: InboxProcessingResultDTOSchema.optional(),
  relatedZone: z
    .object({
      id: z.number(),
      name: z.string(),
      color: z.string().nullable(),
      iconName: z.string().nullable(),
    })
    .optional(),
});

// Bulk processing schema - for processing multiple items
export const BulkProcessInboxDTOSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1, "Select at least one item"),
  action: z.enum(["process", "archive", "delete"]),
  userContext: userContextSchema,
});

// Quick capture with voice support
export const VoiceInboxCaptureDTOSchema = z.object({
  transcription: z.string().min(1, "Transcription cannot be empty"),
  confidence: z.number().min(0).max(1),
  audioMetadata: z
    .object({
      duration: z.number(),
      quality: z.enum(["low", "medium", "high"]),
    })
    .optional(),
});

// Filters for inbox items
export const InboxFiltersSchema = z.object({
  status: z.array(InboxItemStatusSchema).optional(),
  search: z.string().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  hasAiSuggestions: z.boolean().optional(),
});

// Inbox Processing Context Schema - for AI processing context
export const InboxProcessingContextSchema = z.object({
  zones: z.array(z.object({ name: z.string() })),
  userContext: userContextSchema,
});

// Type exports
export type InboxItemDTO = z.infer<typeof InboxItemDTOSchema>;
export type CreateInboxItemDTO = z.infer<typeof CreateInboxItemDTOSchema>;
export type UpdateInboxItemDTO = z.infer<typeof UpdateInboxItemDTOSchema>;
export type ProcessInboxItemDTO = z.infer<typeof ProcessInboxItemDTOSchema>;
export type InboxProcessingResultDTO = z.infer<typeof InboxProcessingResultDTOSchema>;
export type InboxProcessingContext = z.infer<typeof InboxProcessingContextSchema>;
export type InboxItemWithSuggestionsDTO = z.infer<typeof InboxItemWithSuggestionsDTOSchema>;
export type BulkProcessInboxDTO = z.infer<typeof BulkProcessInboxDTOSchema>;
export type VoiceInboxCaptureDTO = z.infer<typeof VoiceInboxCaptureDTOSchema>;
export type InboxFilters = z.infer<typeof InboxFiltersSchema>;
export type InboxItemStatus = z.infer<typeof InboxItemStatusSchema>;

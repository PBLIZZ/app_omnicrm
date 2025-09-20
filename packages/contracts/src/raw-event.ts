import { z } from "zod";

/**
 * Raw Event Domain DTOs
 * Represents raw events from external providers (Gmail, Calendar, etc.)
 */

// Base Raw Event DTO
export const RawEventDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: z.string(), // gmail | calendar | drive | upload
  payload: z.record(z.unknown()), // JSON payload from provider
  contactId: z.string().uuid().nullable(),
  occurredAt: z.date(),
  sourceMeta: z.record(z.unknown()).nullable(),
  batchId: z.string().uuid().nullable(),
  sourceId: z.string().nullable(),
  createdAt: z.date(),
});

export type RawEventDTO = z.infer<typeof RawEventDTOSchema>;

// Create Raw Event DTO
export const CreateRawEventDTOSchema = z.object({
  provider: z.string(),
  payload: z.record(z.unknown()),
  contactId: z.string().uuid().optional(),
  occurredAt: z.date(),
  sourceMeta: z.record(z.unknown()).optional(),
  batchId: z.string().uuid().optional(),
  sourceId: z.string().optional(),
});

export type CreateRawEventDTO = z.infer<typeof CreateRawEventDTOSchema>;

// Raw Event Error DTO
export const RawEventErrorDTOSchema = z.object({
  id: z.string().uuid(),
  rawEventId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  provider: z.string(),
  errorAt: z.date(),
  stage: z.string(), // ingestion | normalization | processing
  error: z.string(),
  context: z.record(z.unknown()).nullable(),
});

export type RawEventErrorDTO = z.infer<typeof RawEventErrorDTOSchema>;

// Create Raw Event Error DTO
export const CreateRawEventErrorDTOSchema = z.object({
  rawEventId: z.string().uuid().optional(),
  provider: z.string(),
  stage: z.string(),
  error: z.string(),
  context: z.record(z.unknown()).optional(),
});

export type CreateRawEventErrorDTO = z.infer<typeof CreateRawEventErrorDTOSchema>;

// Gmail Ingestion Result DTO
export const GmailIngestionResultDTOSchema = z.object({
  totalMessages: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  results: z.array(z.object({
    id: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  })),
});

export type GmailIngestionResultDTO = z.infer<typeof GmailIngestionResultDTOSchema>;

// Raw Event Filters
export const RawEventFiltersSchema = z.object({
  provider: z.array(z.string()).optional(),
  contactId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
  sourceId: z.string().optional(),
  occurredAfter: z.date().optional(),
  occurredBefore: z.date().optional(),
  hasErrors: z.boolean().optional(),
});

export type RawEventFilters = z.infer<typeof RawEventFiltersSchema>;
/**
 * Contact API Business Schemas
 *
 * For base types, import from @/server/db/schema:
 * - Contact (select type)
 * - CreateContact (insert type)
 * - UpdateContact (partial insert type)
 *
 * Generated from Drizzle schema using drizzle-zod.
 *
 * This file contains ONLY API-specific schemas and business logic validations.
 * Per architecture blueprint: JSONB fields use validated schemas from @/lib/validation/jsonb
 */

import { z } from "zod";
import {
  ContactAddressSchema,
  ContactHealthContextSchema,
  ContactPreferencesSchema,
} from "@/lib/validation/jsonb";
import { PaginationQuerySchema } from "@/lib/validation/common";

// Re-export base types from schema for convenience
export type { Contact, CreateContact, UpdateContact } from "@/server/db/schema";

// Create Zod schemas from Drizzle table for API validation
// Note: drizzle-zod doesn't properly infer nullable columns, so we manually override
// Timestamps are returned as Date objects from Drizzle
export const ContactSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  primaryEmail: z.string().nullable(),
  primaryPhone: z.string().nullable(),
  photoUrl: z.string().nullable(),
  source: z.string().nullable(),
  lifecycleStage: z.string().nullable(),
  clientStatus: z.string().nullable(),
  referralSource: z.string().nullable(),
  confidenceScore: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  address: z.unknown(),
  healthContext: z.unknown(),
  preferences: z.unknown(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});

// ============================================================================
// API REQUEST SCHEMAS
// ============================================================================

/**
 * POST /api/contacts - Request body (excludes server-managed fields)
 * Note: Transforms nullable fields to optional non-null for exactOptionalPropertyTypes compatibility
 */
export const CreateContactBodySchema = z.object({
  displayName: z.string().min(1),
  primaryEmail: z.string().email().optional(),
  primaryPhone: z.string().optional(),
  photoUrl: z.string().optional(),
  source: z.string().optional(),
  lifecycleStage: z.string().optional(),
  confidenceScore: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  clientStatus: z.string().optional(),
  referralSource: z.string().optional(),
  address: ContactAddressSchema,
  healthContext: ContactHealthContextSchema,
  preferences: ContactPreferencesSchema,
});

export type CreateContactBody = z.infer<typeof CreateContactBodySchema>;

/**
 * PATCH /api/contacts/[id] - Request body
 * Note: Uses nullable().optional() to allow setting fields to null or omitting them
 */
export const UpdateContactBodySchema = z
  .object({
    displayName: z.string().min(1).optional(),
    primaryEmail: z.string().email().nullish(),
    primaryPhone: z.string().nullish(),
    photoUrl: z.string().nullish(),
    source: z.string().nullish(),
    lifecycleStage: z.string().nullish(),
    confidenceScore: z.string().nullish(),
    dateOfBirth: z.string().nullish(),
    emergencyContactName: z.string().nullish(),
    emergencyContactPhone: z.string().nullish(),
    clientStatus: z.string().nullish(),
    referralSource: z.string().nullish(),
    address: ContactAddressSchema.nullish(),
    healthContext: ContactHealthContextSchema.nullish(),
    preferences: ContactPreferencesSchema.nullish(),
  })
  .partial();

export type UpdateContactBody = z.infer<typeof UpdateContactBodySchema>;

/**
 * GET /api/contacts - Query parameters
 */
export const GetContactsQuerySchema = PaginationQuerySchema.extend({
  pageSize: z.coerce.number().int().min(1).max(3000).default(20), // Override max for contacts
  sort: z.enum(["displayName", "createdAt", "updatedAt"]).default("createdAt"),
  search: z.string().optional(),
  lifecycleStage: z.array(z.string()).optional(),
  source: z.array(z.string()).optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
});

export type GetContactsQuery = z.infer<typeof GetContactsQuerySchema>;

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

/**
 * Contact with last note preview and tags (service layer enrichment)
 * Note: JSONB fields are unknown from DB, use structured schemas for input validation
 */
export const ContactWithLastNoteSchema = ContactSchema.extend({
  lastNote: z.string().nullable(),
  tags: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    category: z.string(),
  })),
});

/**
 * GET /api/contacts - List response
 */
export const ContactListResponseSchema = z.object({
  items: z.array(ContactWithLastNoteSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type ContactListResponse = z.infer<typeof ContactListResponseSchema>;
export type ContactWithLastNote = z.infer<typeof ContactWithLastNoteSchema>;

export const ContactCountResponseSchema = z.object({
  count: z.number(),
});

export const ContactResponseSchema = z.object({
  item: ContactSchema,
});

export const DeleteContactResponseSchema = z.object({
  deleted: z.number(),
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk Delete Body Schema
 * Note: Max 100 IDs per request to prevent resource exhaustion
 * Handler must also enforce authorization and audit logging
 */
export const BulkDeleteBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export type BulkDeleteBody = z.infer<typeof BulkDeleteBodySchema>;

export const BulkDeleteResponseSchema = z.object({
  deleted: z.number(),
  errors: z.array(z.object({ id: z.string(), error: z.string() })),
});

export type BulkDeleteResponse = z.infer<typeof BulkDeleteResponseSchema>;

// ============================================================================
// AI INSIGHTS (Fix shape to match actual service response)
// ============================================================================

export const ContactAIInsightsResponseSchema = z.object({
  insights: z.string(), // Actual response is a string, not array
  suggestions: z.array(z.string()),
  nextSteps: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  keyFindings: z.array(z.string()),
  error: z.boolean().optional(),
  errorMessage: z.string().optional(),
});

export type ContactAIInsightsResponse = z.infer<typeof ContactAIInsightsResponseSchema>;

// ============================================================================
// AVATAR
// ============================================================================

export const AvatarUploadResponseSchema = z.object({
  success: z.boolean(),
  url: z.string().url().optional(),
  message: z.string().optional(),
});

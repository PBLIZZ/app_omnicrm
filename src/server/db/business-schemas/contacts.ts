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
 */

import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { contacts } from "@/server/db/schema";

// Re-export base types from schema for convenience
export type { Contact, CreateContact, UpdateContact } from "@/server/db/schema";

// Create Zod schemas from Drizzle table for API validation
const ContactDataSchema = createSelectSchema(contacts);

// Export base schema for single contact responses
// Override JSONB fields to use unknown (matches Drizzle's Contact type)
export const ContactSchema = ContactDataSchema.extend({
  address: z.unknown(),
  healthContext: z.unknown(),
  preferences: z.unknown(),
  tags: z.unknown(),
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
  tags: z.array(z.string()).optional(),
  confidenceScore: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  clientStatus: z.string().optional(),
  referralSource: z.string().optional(),
  address: z.unknown().optional(),
  healthContext: z.unknown().optional(),
  preferences: z.unknown().optional(),
});

export type CreateContactBody = z.infer<typeof CreateContactBodySchema>;

/**
 * PATCH /api/contacts/[id] - Request body
 * Note: Uses nullable().optional() to allow setting fields to null or omitting them
 */
export const UpdateContactBodySchema = z.object({
  displayName: z.string().min(1).optional(),
  primaryEmail: z.string().email().nullish(),
  primaryPhone: z.string().nullish(),
  photoUrl: z.string().nullish(),
  source: z.string().nullish(),
  lifecycleStage: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  confidenceScore: z.string().nullish(),
  dateOfBirth: z.string().nullish(),
  emergencyContactName: z.string().nullish(),
  emergencyContactPhone: z.string().nullish(),
  clientStatus: z.string().nullish(),
  referralSource: z.string().nullish(),
  address: z.unknown().nullish(),
  healthContext: z.unknown().nullish(),
  preferences: z.unknown().nullish(),
}).partial();

export type UpdateContactBody = z.infer<typeof UpdateContactBodySchema>;

/**
 * GET /api/contacts - Query parameters
 */
export const GetContactsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(3000).default(20),
  sort: z.enum(["displayName", "createdAt", "updatedAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  lifecycleStage: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
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
 * Contact with last note preview (service layer enrichment)
 * Note: JSONB fields (address, healthContext, preferences, tags) are typed as unknown
 * to match the Contact type from Drizzle schema
 */
export const ContactWithLastNoteSchema = ContactDataSchema.extend({
  lastNote: z.string().nullable(),
  // Override JSONB fields to accept unknown (matches Contact type from Drizzle)
  address: z.unknown(),
  healthContext: z.unknown(),
  preferences: z.unknown(),
  tags: z.unknown(),
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
  item: ContactDataSchema,
});

export const DeleteContactResponseSchema = z.object({
  deleted: z.number(),
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export const BulkDeleteBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const BulkDeleteResponseSchema = z.object({
  deleted: z.number(),
  errors: z.array(z.object({ id: z.string(), error: z.string() })),
});

export const BulkEnrichResponseSchema = z.object({
  enriched: z.number(),
  failed: z.number(),
  errors: z.array(z.object({ id: z.string(), error: z.string() })).default([]),
});

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

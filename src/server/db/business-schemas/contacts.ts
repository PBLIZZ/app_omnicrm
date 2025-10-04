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
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { contacts } from "@/server/db/schema";

// Re-export base types from schema for convenience
export type { Contact, CreateContact, UpdateContact } from "@/server/db/schema";

// Create Zod schemas from Drizzle table for API validation
const ContactDataSchema = createSelectSchema(contacts);
const CreateContactDataSchema = createInsertSchema(contacts);

// ============================================================================
// API REQUEST SCHEMAS
// ============================================================================

/**
 * POST /api/contacts - Request body (excludes server-managed fields)
 */
export const CreateContactBodySchema = CreateContactDataSchema.omit({
  userId: true, // From auth
  id: true, // Generated
  createdAt: true, // Generated
  updatedAt: true, // Generated
});

export type CreateContactBody = z.infer<typeof CreateContactBodySchema>;

/**
 * PATCH /api/contacts/[id] - Request body
 */
export const UpdateContactBodySchema = z.object({
  displayName: z.string().min(1).optional(),
  primaryEmail: z.string().email().nullable().optional(),
  primaryPhone: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  lifecycleStage: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  confidenceScore: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  clientStatus: z.string().nullable().optional(),
  referralSource: z.string().nullable().optional(),
  address: z.unknown().nullable().optional(),
  healthContext: z.unknown().nullable().optional(),
  preferences: z.unknown().nullable().optional(),
});

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
 * GET /api/contacts - List response
 * Note: Items have lastNote added by service layer
 */
export const ContactListResponseSchema = z.object({
  items: z.array(ContactDataSchema), // Service adds lastNote at runtime
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

export const ContactCountResponseSchema = z.object({
  count: z.number(),
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

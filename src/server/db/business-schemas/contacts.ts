/**
 * Contact Business Schemas
 *
 * For base types, import from @/server/db/schema:
 * - Contact (select type)
 * - CreateContact (insert type)
 * - UpdateContact (partial insert type)
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

/**
 * Pagination Schema
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Contact Schema - Single contact response
 */
export const ContactResponseSchema = z.object({
  item: ContactDataSchema,
});

/**
 * Update Contact Body Schema
 * Note: id and userId are NOT included as they come from URL parameter and auth
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

/**
 * Delete Contact Response Schema
 */
export const DeleteContactResponseSchema = z.object({
  deleted: z.number(),
});

// ============================================================================
// BULK OPERATIONS SCHEMAS
// ============================================================================

/**
 * Bulk Delete Body Schema (fixed field name)
 */
export const BulkDeleteBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one contact ID required"),
});

export type BulkDeleteBody = z.infer<typeof BulkDeleteBodySchema>;

/**
 * Bulk Delete Response Schema
 */
export const BulkDeleteResponseSchema = z.object({
  deleted: z.number(),
  errors: z.array(
    z.object({
      id: z.string(),
      error: z.string(),
    }),
  ),
});

/**
 * Bulk Enrich Response Schema
 */
export const BulkEnrichResponseSchema = z.object({
  enriched: z.number(),
  failed: z.number(),
  errors: z
    .array(
      z.object({
        id: z.string(),
        error: z.string(),
      }),
    )
    .default([]),
});

// ============================================================================
// COUNT & QUERY SCHEMAS
// ============================================================================

/**
 * Contact Count Response Schema
 */
export const ContactCountResponseSchema = z.object({
  count: z.number(),
});

// ============================================================================
// AI INSIGHTS SCHEMAS
// ============================================================================

/**
 * Contact AI Insights Response Schema (for GET requests)
 */
export const ContactAIInsightsResponseSchema = z.object({
  insights: z.array(
    z.object({
      type: z.string(),
      content: z.string(),
      confidence: z.number().min(0).max(1),
      timestamp: z.coerce.date(),
    }),
  ),
  summary: z.string().optional(),
  recommendations: z.array(z.string()).optional(),
});

export type ContactAIInsightsResponse = z.infer<typeof ContactAIInsightsResponseSchema>;

// ============================================================================
// AVATAR SCHEMAS
// ============================================================================

/**
 * Avatar Upload Response Schema
 */
export const AvatarUploadResponseSchema = z.object({
  success: z.boolean(),
  url: z.string().url().optional(),
  message: z.string().optional(),
});

// ============================================================================
// CONTACT QUERY AND RESPONSE SCHEMAS
// ============================================================================

/**
 * Get Contacts Query Schema (for main route list)
 */
export const GetContactsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(3000).default(20),

  // Sorting
  sort: z.enum(["displayName", "createdAt", "updatedAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),

  // Filtering
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
// CONTACT WITH NOTES SCHEMA (must be defined before ContactListResponseSchema)
// ============================================================================

/**
 * Contact with Notes - Extended type for list views
 * Includes last note preview (first 500 chars) from API aggregation
 */
export const ContactWithNotesSchema = ContactDataSchema.extend({
  lastNote: z.string().nullable().default(null),
});

export type ContactWithNotes = z.infer<typeof ContactWithNotesSchema>;

/**
 * Contact List Response Schema
 * Returns ContactWithNotes (includes lastNote field)
 */
export const ContactListResponseSchema = z.object({
  items: z.array(ContactWithNotesSchema),
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

// ============================================================================
// CONTACT FILTERS
// ============================================================================

/**
 * Contact filters for search/filtering
 */
export const ContactFiltersSchema = z.object({
  search: z.string().optional(),
  lifecycleStage: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  source: z.array(z.string()).optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
});

export type ContactFilters = z.infer<typeof ContactFiltersSchema>;

/**
 * Contact Input Schemas for Forms
 */
export const CreateContactInputSchema = CreateContactDataSchema.extend({
  // Additional form-specific validations
  confirmEmail: z.string().email().optional(),
}).refine(
  (data) => {
    if (data.confirmEmail && data.primaryEmail) {
      return data.confirmEmail === data.primaryEmail;
    }
    return true;
  },
  {
    message: "Email addresses must match",
    path: ["confirmEmail"],
  },
);

export const UpdateContactInputSchema = CreateContactDataSchema.partial().extend({
  confirmEmail: z.string().email().optional(),
}).refine(
  (data) => {
    if (data.confirmEmail && data.primaryEmail) {
      return data.confirmEmail === data.primaryEmail;
    }
    return true;
  },
  {
    message: "Email addresses must match",
    path: ["confirmEmail"],
  },
);

export type CreateContactInput = z.infer<typeof CreateContactInputSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactInputSchema>;

/**
 * Contact API Types
 */
// Request body schema - omits userId since it's injected by auth handler
export const CreateContactBodySchema = CreateContactDataSchema.omit({ userId: true, id: true, createdAt: true, updatedAt: true });

export type CreateContactBody = z.infer<typeof CreateContactBodySchema>;

/**
 * Created At Filter Schema
 */
export const CreatedAtFilterSchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return data.from <= data.to;
      }
      return true;
    },
    {
      message: "From date must be before to date",
    },
  );

export type CreatedAtFilter = z.infer<typeof CreatedAtFilterSchema>;

/**
 * Utility function to convert date strings to Date range
 */
export function toDateRange(from?: string, to?: string): { from?: Date; to?: Date } {
  const result: { from?: Date; to?: Date } = {};
  if (from) result.from = new Date(from);
  if (to) result.to = new Date(to);
  return result;
}

// ============================================================================
// NOTES SCHEMAS (re-exported for convenience)
// ============================================================================

// Re-export note types for convenience
export { NoteSchema, CreateNoteSchema, UpdateNoteSchema } from "./notes";
export type { Note, CreateNote, UpdateNote } from "./notes";

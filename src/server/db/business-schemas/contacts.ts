/**
 * Contact Business Schemas
 *
 * Business logic validation schemas for contact-related API endpoints
 */

import { z } from "zod";
import {
  type Contact as DbContact,
  type CreateContact as DbCreateContact,
} from "@/server/db/schema";

// ============================================================================
// CORE CONTACT SCHEMAS
// ============================================================================

/**
 * Base Contact Schema - matches database reality exactly
 */
export const ContactSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  primaryEmail: z.string().nullable(),
  primaryPhone: z.string().nullable(),
  source: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lifecycleStage: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  confidenceScore: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  clientStatus: z.string().nullable(),
  referralSource: z.string().nullable(),
  address: z.unknown().nullable(),
  healthContext: z.unknown().nullable(),
  preferences: z.unknown().nullable(),
  photoUrl: z.string().nullable(),
}) satisfies z.ZodType<DbContact>;

export type Contact = z.infer<typeof ContactSchema>;

/**
 * Create Contact Schema - matches database insert type
 */
export const CreateContactSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().min(1),
  primaryEmail: z.string().optional(),
  primaryPhone: z.string().optional(),
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
  photoUrl: z.string().optional(),
}) satisfies z.ZodType<DbCreateContact>;

export type CreateContact = z.infer<typeof CreateContactSchema>;

/**
 * Update Contact Schema - Input for updating contacts
 */
export const UpdateContactSchema = CreateContactSchema.partial();

export type UpdateContact = z.infer<typeof UpdateContactSchema>;

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
  item: ContactSchema.extend({
    fullName: z.string(), // Legacy alias
  }),
});

export type ContactResponse = z.infer<typeof ContactResponseSchema>;

/**
 * Update Contact Body Schema
 */
export const UpdateContactBodySchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).optional(),
  primaryEmail: z.string().email().nullable().optional(),
  primaryPhone: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().nullable().optional(),
});

export type UpdateContactBody = z.infer<typeof UpdateContactBodySchema>;

/**
 * Delete Contact Response Schema
 */
export const DeleteContactResponseSchema = z.object({
  deleted: z.number(),
});

export type DeleteContactResponse = z.infer<typeof DeleteContactResponseSchema>;

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
  errors: z
    .array(
      z.object({
        id: z.string(),
        error: z.string(),
      }),
    )
    .default([]),
});

export type BulkDeleteResponse = z.infer<typeof BulkDeleteResponseSchema>;

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

export type BulkEnrichResponse = z.infer<typeof BulkEnrichResponseSchema>;

// ============================================================================
// COUNT & QUERY SCHEMAS
// ============================================================================

/**
 * Contact Count Response Schema
 */
export const ContactCountResponseSchema = z.object({
  count: z.number(),
});

export type ContactCountResponse = z.infer<typeof ContactCountResponseSchema>;

// ============================================================================
// AI INSIGHTS SCHEMAS
// ============================================================================

/**
 * Client AI Insights Response Schema (for GET requests)
 */
export const ClientAIInsightsResponseSchema = z.object({
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

export type ClientAIInsightsResponse = z.infer<typeof ClientAIInsightsResponseSchema>;

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

export type AvatarUploadResponse = z.infer<typeof AvatarUploadResponseSchema>;

// ============================================================================
// CONTACT QUERY AND RESPONSE SCHEMAS
// ============================================================================

/**
 * Get Contacts Query Schema (for main route list)
 */
export const GetContactsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),

  // Sorting
  sort: z.enum(["displayName", "createdAt", "updatedAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),

  // Filtering
  search: z.string().optional(),
  stage: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  source: z.array(z.string()).optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
});

export type GetContactsQuery = z.infer<typeof GetContactsQuerySchema>;

/**
 * Contact List Response Schema
 */
export const ContactListResponseSchema = z.object({
  items: z.array(ContactSchema),
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
  stage: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  source: z.array(z.string()).optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
});

export type ContactFilters = z.infer<typeof ContactFiltersSchema>;

// Legacy alias for backward compatibility
export type ClientSearchFilters = ContactFilters;

// ============================================================================
// CONTACT WITH NOTES SCHEMA
// ============================================================================

/**
 * Contact with Notes - Extended type for detail views
 */
export const ContactWithNotesSchema = ContactSchema.extend({
  notes: z
    .array(
      z.object({
        id: z.string().uuid(),
        userId: z.string().uuid(),
        title: z.string().nullable(),
        content: z.string(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
        contactId: z.string().uuid().nullable(),
      }),
    )
    .default([]),
});

export type ContactWithNotes = z.infer<typeof ContactWithNotesSchema>;

// Legacy alias for backward compatibility
export type OmniClientWithNotesDTO = ContactWithNotes;
export type ClientWithNotes = ContactWithNotes;

/**
 * Contact Input Schemas for Forms
 */
export const CreateContactInputSchema = CreateContactSchema.extend({
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

export const UpdateContactInputSchema = UpdateContactSchema.extend({
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
export const CreateContactBodySchema = CreateContactSchema;

export type CreateContactBody = CreateContact;

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
 * Fetch Contacts Params (for API functions)
 */
export interface FetchContactsParams {
  page?: number;
  pageSize?: number;
  sort?: "displayName" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
  search?: string;
  stage?: string[];
  tags?: string[];
  source?: string[];
  hasEmail?: boolean;
  hasPhone?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

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

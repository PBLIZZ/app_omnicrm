/**
 * OmniClients Business Schema
 *
 * Legacy compatibility layer for the old OmniClients API
 * Maps to the new Contact types but preserves OmniClient naming for UI components
 */

import { z } from "zod";
import {
  ContactSchema,
  CreateContactSchema,
  UpdateContactSchema,
  ContactFiltersSchema,
  PaginationSchema,
  NoteSchema,
  CreateNoteSchema,
  UpdateNoteSchema,
  type Contact,
  type CreateContact,
  type UpdateContact,
  type ContactFilters,
  type Note,
  type CreateNote,
  type UpdateNote,
} from "./business-schema";

// ============================================================================
// OMNI CLIENTS LEGACY COMPATIBILITY TYPES
// ============================================================================

/**
 * Base OmniClient schema without transform
 */
const BaseOmniClientSchema = ContactSchema;

/**
 * OmniClient with Notes - Extended type for detail views
 */
const OmniClientWithNotesBaseSchema = BaseOmniClientSchema.extend({
  notes: z.array(NoteSchema).default([]),
});

/**
 * OmniClient DTO - Legacy naming for UI compatibility
 */
export const OmniClientSchema = BaseOmniClientSchema.transform((contact) => ({
  ...contact,
  // Add any OmniClient-specific computed fields if needed
  fullName: contact.displayName, // Legacy alias
}));

export type OmniClientDTO = z.infer<typeof OmniClientSchema>;

/**
 * OmniClient with Notes - Extended type for detail views
 */
export const OmniClientWithNotesSchema = OmniClientWithNotesBaseSchema.transform((contact) => ({
  ...contact,
  // Add any OmniClient-specific computed fields if needed
  fullName: contact.displayName, // Legacy alias
}));

export type OmniClientWithNotesDTO = z.infer<typeof OmniClientWithNotesSchema>;

/**
 * Create OmniClient Schema
 */
export const CreateOmniClientSchema = CreateContactSchema;
export type CreateOmniClientDTO = CreateContact;

/**
 * Update OmniClient Schema
 */
export const UpdateOmniClientSchema = UpdateContactSchema;
export type UpdateOmniClientDTO = UpdateContact;

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

/**
 * Get OmniClients Query Schema
 */
export const GetOmniClientsQuerySchema = z.object({
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

export type GetOmniClientsQuery = z.infer<typeof GetOmniClientsQuerySchema>;

/**
 * Client Search Filters
 */
export const ClientSearchFiltersSchema = ContactFiltersSchema;
export type ClientSearchFilters = ContactFilters;

/**
 * Contact List Response Schema
 */
export const ContactListResponseSchema = z.object({
  items: z.array(OmniClientSchema),
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

/**
 * Contact API Types (for the new contacts API)
 */
export const CreateContactBodySchema = CreateContactSchema;
export const UpdateContactBodySchema = UpdateContactSchema;
export const GetContactsQuerySchema = GetOmniClientsQuerySchema;

export type CreateContactBody = CreateContact;
export type UpdateContactBody = UpdateContact;
export type GetContactsQuery = GetOmniClientsQuery;

// ============================================================================
// FORM SCHEMAS
// ============================================================================

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

// ============================================================================
// UTILITY SCHEMAS
// ============================================================================

/**
 * Bulk Delete Body Schema
 */
export const BulkDeleteBodySchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1, "At least one contact ID required"),
});

export type BulkDeleteBody = z.infer<typeof BulkDeleteBodySchema>;

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

// ============================================================================
// AI INSIGHTS TYPES
// ============================================================================

/**
 * Client AI Insights Response
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
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert date strings to Date range
 */
export function toDateRange(from?: string, to?: string): { from?: Date; to?: Date } {
  return {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export all schemas for backward compatibility
export {
  // Note schemas
  NoteSchema,
  CreateNoteSchema,
  UpdateNoteSchema,
  type Note,
  type CreateNote,
  type UpdateNote,
};

/**
 * Contact Business Schemas
 *
 * Business logic validation schemas for contact-related API endpoints
 */

import { z } from "zod";

// ============================================================================
// CORE CONTACT SCHEMAS
// ============================================================================

/**
 * Contact Schema - Single contact response
 */
export const ContactResponseSchema = z.object({
  item: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    primaryEmail: z.string().email().nullable(),
    primaryPhone: z.string().nullable(),
    stage: z.string().nullable(),
    tags: z.array(z.string()).default([]),
    source: z.string().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    fullName: z.string(), // Legacy alias
  })
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
  errors: z.array(z.object({
    id: z.string(),
    error: z.string(),
  })).default([]),
});

export type BulkDeleteResponse = z.infer<typeof BulkDeleteResponseSchema>;

/**
 * Bulk Enrich Response Schema
 */
export const BulkEnrichResponseSchema = z.object({
  enriched: z.number(),
  failed: z.number(),
  errors: z.array(z.object({
    id: z.string(),
    error: z.string(),
  })).default([]),
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
  insights: z.array(z.object({
    type: z.string(),
    content: z.string(),
    confidence: z.number().min(0).max(1),
    timestamp: z.coerce.date(),
  })),
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
// OMNI CLIENTS LEGACY COMPATIBILITY
// ============================================================================

/**
 * Get OmniClients Query Schema (for main route list)
 */
export const GetOmniClientsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),

  // Sorting
  sort: z.enum(['displayName', 'createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),

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
 * OmniClient DTO - Response format for compatibility
 */
export const OmniClientSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  primaryEmail: z.string().email().nullable(),
  primaryPhone: z.string().nullable(),
  stage: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  source: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  fullName: z.string(), // Legacy alias
});

export type OmniClient = z.infer<typeof OmniClientSchema>;

/**
 * Create OmniClient Schema (input)
 */
export const CreateOmniClientSchema = z.object({
  displayName: z.string().min(1),
  primaryEmail: z.string().email().optional(),
  primaryPhone: z.string().optional(),
  stage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
});

export type CreateOmniClient = z.infer<typeof CreateOmniClientSchema>;

/**
 * Contact List Response Schema for omni-clients route
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
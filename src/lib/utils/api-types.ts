/**
 * API boundary type definitions
 *
 * Replaces 'any' types at API boundaries with proper named interfaces
 * for better type safety and error handling.
 */

import { z } from "zod";

// ============================================================================
// RESULT PATTERN INTEGRATION
// ============================================================================

// ApiResponse pattern has been replaced with Result<T, E> pattern
// Import Result types from result.ts when needed

// ============================================================================
// PAGINATION INTERFACES
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  // Sanitize and clamp inputs to avoid Infinity/NaN and fix zero-result edge cases
  const sanitizedPageSize = Math.max(1, Math.min(100, Math.floor(pageSize) || 1));
  const sanitizedTotal = Math.max(0, Math.floor(total) || 0);
  const sanitizedPage = Math.max(1, Math.floor(page) || 1);

  // Compute totalPages as 0 when total === 0, otherwise Math.ceil(total / pageSize)
  const totalPages = sanitizedTotal === 0 ? 0 : Math.ceil(sanitizedTotal / sanitizedPageSize);

  // Clamp page to at most totalPages (or to 1 when totalPages === 0)
  const clampedPage = totalPages === 0 ? 1 : Math.min(sanitizedPage, totalPages);

  return {
    page: clampedPage,
    pageSize: sanitizedPageSize,
    total: sanitizedTotal,
    totalPages,
    hasNext: clampedPage < totalPages,
    hasPrev: clampedPage > 1,
  };
}

// ============================================================================
// DATABASE OPERATION INTERFACES
// ============================================================================

export interface CreateOperation<T> {
  data: T;
  metadata?: {
    createdAt: string;
    createdBy?: string;
  };
}

export interface UpdateOperation<T> {
  id: string;
  data: Partial<T>;
  metadata?: {
    updatedAt: string;
    updatedBy?: string;
  };
}

// ============================================================================
// SEARCH AND FILTER INTERFACES
// ============================================================================

export interface SearchRequest {
  query?: string;
  filters?: Record<string, unknown>;
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
  pagination?: {
    page: number;
    pageSize: number;
  };
}

export interface SearchResponse<T> extends PaginatedResponse<T> {
  query?: string;
  filters?: Record<string, unknown>;
  executionTime?: number;
}

// ============================================================================
// JOB/TASK INTERFACES
// ============================================================================

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// ApiResponseSchema removed - use Result<T, E> pattern instead

export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const SearchRequestSchema = z.object({
  query: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  sort: z
    .object({
      field: z.string(),
      direction: z.enum(["asc", "desc"]),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1).max(100),
    })
    .optional(),
});

// ============================================================================
// TYPE GUARDS
// ============================================================================

// ApiResponse type guards removed - use isOk/isErr from result.ts instead

export function isPaginatedResponse<T>(value: unknown): value is PaginatedResponse<T> {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Check that items is an array
  if (!Array.isArray(obj["items"])) return false;

  // Validate meta object using schema
  const metaValidation = PaginationMetaSchema.safeParse(obj["meta"]);
  if (!metaValidation.success) return false;

  return true;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create paginated response with pagination metadata
 *
 * @param items - Array of items to paginate
 * @param total - Total number of items available
 * @param page - Current page number (1-based)
 * @param pageSize - Number of items per page
 * @returns PaginatedResponse with items array and pagination meta
 *
 * @example
 * const response = toPaginatedResponse(contacts, 100, 1, 20);
 * // Returns: { items: contacts, meta: { page: 1, pageSize: 20, total: 100, ... } }
 */
export function toPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  const meta = createPaginationMeta(page, pageSize, total);
  return { items, meta };
}

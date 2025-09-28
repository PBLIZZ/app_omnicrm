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

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

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
  const totalPages = Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ============================================================================
// DATABASE OPERATION INTERFACES
// ============================================================================

export interface DatabaseError {
  code: string;
  message: string;
  constraint?: string;
  table?: string;
  column?: string;
  detail?: unknown;
}

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

export interface DeleteOperation {
  id: string;
  metadata?: {
    deletedAt: string;
    deletedBy?: string;
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

export interface JobRequest {
  type: string;
  data: Record<string, unknown>;
  priority?: number;
  delay?: number;
  retries?: number;
}

export interface JobResponse {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  type: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: {
    current: number;
    total: number;
    message?: string;
  };
  result?: unknown;
  error?: string;
}

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
  filters: z.record(z.unknown()).optional(),
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
  return Array.isArray(obj.items) && typeof obj.meta === "object" && obj.meta !== null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create paginated response with Result pattern
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

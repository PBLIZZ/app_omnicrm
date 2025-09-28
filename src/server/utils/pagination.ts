/**
 * Server-side pagination utilities
 * 
 * Schemas and types for API pagination
 */

import { z } from "zod";

/**
 * Pagination schema for list endpoints
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type Pagination = z.infer<typeof PaginationSchema>;

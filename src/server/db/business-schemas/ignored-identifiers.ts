/**
 * Data Intelligence - Ignored Identifier Business Schemas
 *
 * Base drizzle types are re-exported for convenience:
 * - IgnoredIdentifier (select type)
 * - CreateIgnoredIdentifier (insert type)
 */

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { ignoredIdentifiers } from "@/server/db/schema";

export type {
  IgnoredIdentifier,
  CreateIgnoredIdentifier,
  UpdateIgnoredIdentifier,
} from "@/server/db/schema";

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const BaseIgnoredIdentifierSchema = createSelectSchema(ignoredIdentifiers);

export const IgnoredIdentifierSchema = BaseIgnoredIdentifierSchema;

export type IgnoredIdentifierDTO = z.infer<typeof IgnoredIdentifierSchema>;

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const IdentifierKindSchema = z.enum(["email", "phone", "handle", "provider_id"]);

export const CreateIgnoredIdentifierBodySchema = z.object({
  kind: IdentifierKindSchema,
  value: z.string().min(1, "value is required"),
  reason: z.string().optional(),
});

export type CreateIgnoredIdentifierBody = z.infer<typeof CreateIgnoredIdentifierBodySchema>;

export const UpdateIgnoredIdentifierBodySchema = z
  .object({
    reason: z.string().nullish(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });

export type UpdateIgnoredIdentifierBody = z.infer<typeof UpdateIgnoredIdentifierBodySchema>;

export const IgnoredIdentifierQuerySchema = z.object({
  kind: z.array(z.string()).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type IgnoredIdentifierQuery = z.infer<typeof IgnoredIdentifierQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const IgnoredIdentifierListResponseSchema = z.object({
  items: z.array(IgnoredIdentifierSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type IgnoredIdentifierListResponse = z.infer<typeof IgnoredIdentifierListResponseSchema>;

export const IgnoredIdentifierResponseSchema = z.object({
  item: IgnoredIdentifierSchema,
});

export type IgnoredIdentifierResponse = z.infer<typeof IgnoredIdentifierResponseSchema>;

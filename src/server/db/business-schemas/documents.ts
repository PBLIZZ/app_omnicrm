/**
 * Data Intelligence - Document Business Schemas
 *
 * Base drizzle types are re-exported for convenience:
 * - IntelligenceDocument (select type)
 * - CreateIntelligenceDocument (insert type)
 * - UpdateIntelligenceDocument (partial insert type)
 */

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { documents } from "@/server/db/schema";

export type {
  IntelligenceDocument,
  CreateIntelligenceDocument,
  UpdateIntelligenceDocument,
} from "@/server/db/schema";

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const BaseDocumentSchema = createSelectSchema(documents);

export const DocumentSchema = BaseDocumentSchema.extend({
  meta: z.unknown(),
});

export type DocumentDTO = z.infer<typeof DocumentSchema>;

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const BaseDocumentPayloadSchema = z.object({
  ownerContactId: z.string().uuid().nullish(),
  title: z.string().optional(),
  text: z.string().optional(),
  mime: z.string().optional(),
  meta: z.unknown().optional(),
});

export const CreateDocumentBodySchema = BaseDocumentPayloadSchema.refine(
  (data) => Boolean(data.title) || Boolean(data.text),
  {
    message: "title or text is required",
  },
);

export type CreateDocumentBody = z.infer<typeof CreateDocumentBodySchema>;

export const UpdateDocumentBodySchema = BaseDocumentPayloadSchema.partial().superRefine(
  (data, ctx) => {
    if (
      data.title === undefined &&
      data.text === undefined &&
      data.mime === undefined &&
      data.meta === undefined &&
      data.ownerContactId === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
      });
    }
  },
);

export type UpdateDocumentBody = z.infer<typeof UpdateDocumentBodySchema>;

export const DocumentQuerySchema = z.object({
  ownerContactId: z.string().uuid().optional(),
  mime: z.array(z.string()).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50),
  order: z.enum(["asc", "desc"]).default("desc"),
  sort: z.enum(["createdAt"]).default("createdAt"),
});

export type DocumentQuery = z.infer<typeof DocumentQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const DocumentListResponseSchema = z.object({
  items: z.array(DocumentSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type DocumentListResponse = z.infer<typeof DocumentListResponseSchema>;

export const DocumentResponseSchema = z.object({
  item: DocumentSchema,
});

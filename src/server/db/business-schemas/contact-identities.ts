/**
 * Data Intelligence - Contact Identity Business Schemas
 *
 * Base drizzle types are re-exported for convenience:
 * - ContactIdentity (select type)
 * - CreateContactIdentity (insert type)
 * - UpdateContactIdentity (partial insert type)
 */

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { contactIdentities } from "@/server/db/schema";

export type {
  ContactIdentity,
  CreateContactIdentity,
  UpdateContactIdentity,
} from "@/server/db/schema";

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const BaseContactIdentitySchema = createSelectSchema(contactIdentities);

export const ContactIdentitySchema = BaseContactIdentitySchema;

export type ContactIdentityDTO = z.infer<typeof ContactIdentitySchema>;

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const CreateContactIdentityBodySchema = z.object({
  contactId: z.string().uuid(),
  kind: z.string().min(1, "kind is required"),
  value: z.string().min(1, "value is required"),
  provider: z.string().optional(),
});

export type CreateContactIdentityBody = z.infer<typeof CreateContactIdentityBodySchema>;

export const UpdateContactIdentityBodySchema = z
  .object({
    kind: z.string().min(1).optional(),
    value: z.string().min(1).optional(),
    provider: z.string().nullish(),
  })
  .refine(
    (data) => data.kind !== undefined || data.value !== undefined || data.provider !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

export type UpdateContactIdentityBody = z.infer<typeof UpdateContactIdentityBodySchema>;

export const ContactIdentityQuerySchema = z.object({
  contactId: z.string().uuid().optional(),
  kind: z.array(z.string()).optional(),
  provider: z.array(z.string()).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50),
});

export type ContactIdentityQuery = z.infer<typeof ContactIdentityQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const ContactIdentityListResponseSchema = z.object({
  items: z.array(ContactIdentitySchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type ContactIdentityListResponse = z.infer<typeof ContactIdentityListResponseSchema>;

export const ContactIdentityResponseSchema = z.object({
  item: ContactIdentitySchema,
});

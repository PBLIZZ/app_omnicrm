// Contact DTOs, queries, and create/update schemas
// Data types sourced from server/db/schema.ts (canonical database schema)
// No manual types created - all types inferred from zod schemas

import { z } from "zod";

// --- DTOs (match database schema from server/db/schema.ts) ---
export const ContactDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  primaryEmail: z.string().email().nullable(),
  primaryPhone: z.string().nullable(),
  source: z.string().nullable(), // gmail_import | manual | upload
  createdAt: z.string(), // ISO string from API
  updatedAt: z.string(), // ISO string from API
});
export type ContactDTO = z.infer<typeof ContactDTOSchema>;

export const ContactListResponseSchema = z.object({
  items: z.array(ContactDTOSchema),
  total: z.number().int().nonnegative(),
});
export type ContactListResponse = z.infer<typeof ContactListResponseSchema>;

// --- Query schema (from existing api/contacts/schema.ts) ---
export const CreatedAtFilterSchema = z.object({
  mode: z.enum(["any", "today", "week", "month", "quarter", "year", "range"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const GetContactsQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(200).optional(),
    sort: z.enum(["displayName", "createdAt"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().min(1).max(100000).optional(),
    pageSize: z.coerce.number().int().min(1).max(200).optional(),
    createdAtFilter: z
      .string()
      .transform((v) => {
        try {
          return CreatedAtFilterSchema.parse(JSON.parse(v));
        } catch {
          throw new Error("invalid_createdAtFilter");
        }
      })
      .optional(),
  })
  .strict();
export type GetContactsQuery = z.infer<typeof GetContactsQuerySchema>;
export type CreatedAtFilter = z.infer<typeof CreatedAtFilterSchema>;

// --- Bodies ---
export const CreateContactBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(200),
    primaryEmail: z.string().email().max(320).nullable().optional(),
    primaryPhone: z.string().min(3).max(50).nullable().optional(),
    tags: z.array(z.string()).max(100).default([]),
    notes: z.string().max(5000).nullable().optional(),
    source: z.literal("manual"),
  })
  .strict();
export type CreateContactBody = z.infer<typeof CreateContactBodySchema>;

export const UpdateContactBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(200).optional(),
    primaryEmail: z.string().email().max(320).nullable().optional(),
    primaryPhone: z.string().min(3).max(50).nullable().optional(),
    tags: z.array(z.string()).max(100).optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict();
export type UpdateContactBody = z.infer<typeof UpdateContactBodySchema>;

// --- Bulk delete ---
export const BulkDeleteBodySchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1),
  })
  .strict();
export type BulkDeleteBody = z.infer<typeof BulkDeleteBodySchema>;

// Date range helper function (from existing schema)
export function toDateRange(
  filter:
    | {
        mode?: "any" | "today" | "week" | "month" | "quarter" | "year" | "range" | undefined;
        from?: string | undefined;
        to?: string | undefined;
      }
    | undefined,
): { from?: Date; to?: Date } | undefined {
  if (!filter?.mode || filter.mode === "any") return undefined;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (filter.mode) {
    case "today":
      return { from: startOfDay };
    case "week": {
      const day = startOfDay.getDay();
      const diff = (day + 6) % 7; // Monday as start
      const weekStart = new Date(startOfDay);
      weekStart.setDate(startOfDay.getDate() - diff);
      return { from: weekStart };
    }
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1) };
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), q * 3, 1) };
    }
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1) };
    case "range": {
      const from = filter.from ? new Date(filter.from) : undefined;
      const to = filter.to ? new Date(filter.to) : undefined;
      const out: { from?: Date; to?: Date } = {};
      if (from) out.from = from;
      if (to) out.to = to;
      return Object.keys(out).length ? out : undefined;
    }
    default:
      return undefined;
  }
}

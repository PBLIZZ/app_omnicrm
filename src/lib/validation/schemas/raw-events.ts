// src/server/schemas/raw-events.ts
// DTOs and query schemas for raw events listing
// Data types sourced from server/db/schema.ts (canonical database schema)

import { z } from "zod";
import { CreatedAtFilterSchema } from "./omniClients";

// --- DTO (match database schema from server/db/schema.ts) ---
export const RawEventDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: z.string(), // gmail | calendar | drive | upload
  payload: z.unknown(),
  contactId: z.string().uuid().nullable(),
  occurredAt: z.string(), // ISO string in API
  sourceMeta: z.unknown().optional(),
  batchId: z.string().uuid().nullable(),
  sourceId: z.string().nullable(),
  createdAt: z.string(), // ISO string in API
});
export type RawEventDTO = z.infer<typeof RawEventDTOSchema>;

export const RawEventListResponseSchema = z.object({
  items: z.array(RawEventDTOSchema),
  total: z.number().int().nonnegative(),
});
export type RawEventListResponse = z.infer<typeof RawEventListResponseSchema>;

// --- Query schema ---
export const GetRawEventsQuerySchema = z
  .object({
    // Route is Gmail-specific; keep provider optional but default to gmail
    provider: z.literal("gmail").optional(),
    page: z.coerce.number().int().min(1).max(100000).optional(),
    pageSize: z.coerce.number().int().min(1).max(200).optional(),
    sort: z.enum(["occurredAt", "createdAt"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
    occurredAtFilter: z
      .string()
      .transform((v) => {
        try {
          return CreatedAtFilterSchema.parse(JSON.parse(v));
        } catch {
          throw new Error("invalid_occurredAtFilter");
        }
      })
      .optional(),
  })
  .strict();
export type GetRawEventsQuery = z.infer<typeof GetRawEventsQuerySchema>;

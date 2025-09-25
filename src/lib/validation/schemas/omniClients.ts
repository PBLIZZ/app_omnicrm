// OmniClients API Schemas
// Validation schemas for OmniClients API endpoints
// Based on the UI view-model types, not the backend Contact types

import { z } from "zod";

// --- OmniClient DTOs (API response types) ---
export const OmniClientSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  primaryEmail: z.string().email().nullable(),
  primaryPhone: z.string().nullable(),
  source: z.string().nullable(),
  lifecycleStage: z.string().nullable(),
  tags: z.array(z.string()).nullable(), // jsonb wellness tags array
  confidenceScore: z.string().nullable(),
  photoUrl: z.string().nullable(),
  createdAt: z.string(), // ISO string
  updatedAt: z.string(), // ISO string
});
export type OmniClientDTO = z.infer<typeof OmniClientSchema>;

export const OmniClientWithNotesSchema = OmniClientSchema.extend({
  notesCount: z.number().int().nonnegative(),
  lastNote: z.string().nullable(),
  interactions: z.number().int().nonnegative().optional(),
  notes: z
    .array(
      z.object({
        id: z.string(),
        content: z.string(),
        createdAt: z.string(),
      }),
    )
    .optional(),
});
export type OmniClientWithNotesDTO = z.infer<typeof OmniClientWithNotesSchema>;

// --- Request Schemas ---
export const CreateOmniClientSchema = z.object({
  displayName: z.string().min(1).max(200).trim(),
  primaryEmail: z.string().email().nullable().optional(),
  primaryPhone: z.string().max(50).nullable().optional(),
  source: z.enum(["manual", "gmail_import", "upload", "calendar_import"]).default("manual"),
  lifecycleStage: z.string().max(100).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(), // wellness tags array
});
export type CreateOmniClientInput = z.infer<typeof CreateOmniClientSchema>;

export const UpdateOmniClientSchema = z.object({
  displayName: z.string().min(1).max(200).trim().optional(),
  primaryEmail: z.string().email().nullable().optional(),
  primaryPhone: z.string().max(50).nullable().optional(),
  lifecycleStage: z.string().max(100).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(), // wellness tags array
});
export type UpdateOmniClientInput = z.infer<typeof UpdateOmniClientSchema>;

// --- Query Schemas ---
export const GetOmniClientsQuerySchema = z.object({
  search: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(1).max(200).optional(),
  ),
  sort: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.enum(["displayName", "createdAt", "updatedAt"]).optional(),
  ),
  order: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.enum(["asc", "desc"]).optional(),
  ),
  page: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number().int().min(1).max(1000).optional(),
  ),
  pageSize: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number().int().min(1).max(200).optional(),
  ),
  limit: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number().int().min(1).max(200).optional(),
  ),
  cursor: z.string().optional(),
  // Support for createdAtFilter from contacts-api.ts
  createdAtFilter: z.preprocess(
    (v) => {
      if (typeof v === "string" && v.trim() === "") return undefined;
      if (typeof v === "string") {
        try {
          return JSON.parse(v);
        } catch (error) {
          throw new z.ZodError([
            {
              code: z.ZodIssueCode.custom,
              message: "createdAtFilter: malformed JSON",
              path: ["createdAtFilter"],
            },
          ]);
        }
      }
      return v;
    },
    z
      .object({
        start: z.string().optional(),
        end: z.string().optional(),
      })
      .optional(),
  ),
});
export type GetOmniClientsQuery = z.infer<typeof GetOmniClientsQuerySchema>;

// --- Response Schemas ---
export const OmniClientsListResponseSchema = z.object({
  items: z.array(OmniClientWithNotesSchema),
  total: z.number().int().nonnegative(),
  nextCursor: z.string().nullable().optional(),
});
export type OmniClientsListResponseDTO = z.infer<typeof OmniClientsListResponseSchema>;

export const OmniClientResponseSchema = z.object({
  item: OmniClientSchema,
});
export type OmniClientResponseDTO = z.infer<typeof OmniClientResponseSchema>;

// --- Client Suggestions (Calendar Import) ---
export const ClientSuggestionSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  eventCount: z.number().int().nonnegative(),
  lastEventDate: z.string(), // ISO string
  eventTitles: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  source: z.literal("calendar_attendee"),
});
export type ClientSuggestion = z.infer<typeof ClientSuggestionSchema>;

export const ClientSuggestionsResponseSchema = z.object({
  suggestions: z.array(ClientSuggestionSchema),
});
export type ClientSuggestionsResponse = z.infer<typeof ClientSuggestionsResponseSchema>;

// --- AI Feature Schemas ---
export const ClientAIInsightsResponseSchema = z.object({
  insights: z.object({
    wellnessGoals: z.array(z.string()).optional(),
    preferences: z.array(z.string()).optional(),
    engagementLevel: z.string().optional(),
    risks: z.array(z.string()).optional(),
    opportunities: z.array(z.string()).optional(),
    nextSteps: z.array(z.string()).optional(),
  }),
  confidence: z.number().min(0).max(1),
});
export type ClientAIInsightsResponse = z.infer<typeof ClientAIInsightsResponseSchema>;

export const ClientEmailSuggestionSchema = z.object({
  subject: z.string(),
  content: z.string(),
  tone: z.string(),
  reasoning: z.string(),
});
export type ClientEmailSuggestion = z.infer<typeof ClientEmailSuggestionSchema>;

export const ClientNoteSuggestionSchema = z.object({
  title: z.string(),
  content: z.string(),
  category: z.string(),
  priority: z.enum(["low", "medium", "high"]),
});
export type ClientNoteSuggestion = z.infer<typeof ClientNoteSuggestionSchema>;

export const ClientNoteSuggestionsResponseSchema = z.array(ClientNoteSuggestionSchema);
export type ClientNoteSuggestionsResponse = z.infer<typeof ClientNoteSuggestionsResponseSchema>;

// --- Notes Schemas ---
export const CreateNoteSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(5000).trim(),
});
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

export const UpdateNoteSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(5000).trim().optional(),
});
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;

// --- Additional schemas from contacts.ts ---
export const CreatedAtFilterSchema = z.object({
  mode: z.enum(["any", "today", "week", "month", "quarter", "year", "range"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type CreatedAtFilter = z.infer<typeof CreatedAtFilterSchema>;

export const BulkDeleteBodySchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1),
  })
  .strict();
export type BulkDeleteBody = z.infer<typeof BulkDeleteBodySchema>;

// --- Legacy Contact types for backward compatibility ---
export const ContactDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  primaryEmail: z.string().email().nullable(),
  primaryPhone: z.string().nullable(),
  source: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  avatar: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lifecycleStage: z.enum(["lead", "prospect", "customer", "advocate"]).optional(),
  lastContactDate: z.string().optional(),
  notes: z.string().optional(),
  company: z.string().optional(),
});
export type ContactDTO = z.infer<typeof ContactDTOSchema>;

export const ContactListResponseSchema = z.object({
  items: z.array(ContactDTOSchema),
  total: z.number().int().nonnegative(),
});
export type ContactListResponse = z.infer<typeof ContactListResponseSchema>;

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

export const GetContactsQuerySchema = z
  .object({
    search: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().min(1).max(200).optional(),
    ),
    sort: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.enum(["displayName", "createdAt"]).optional(),
    ),
    order: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.enum(["asc", "desc"]).optional(),
    ),
    page: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.coerce.number().int().min(1).max(100000).optional(),
    ),
    pageSize: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.coerce.number().int().min(1).max(200).optional(),
    ),
    createdAtFilter: z
      .string()
      .transform((v) => {
        const input = v.trim();
        if (input.length === 0) return undefined;
        if (input === "null" || input === "undefined") return undefined;
        const shorthand = ["any", "today", "week", "month", "quarter", "year"].includes(input)
          ? ({ mode: input } as const)
          : undefined;
        if (shorthand) return shorthand;
        try {
          return CreatedAtFilterSchema.parse(JSON.parse(input));
        } catch {
          return undefined;
        }
      })
      .optional(),
  })
  .strict();
export type GetContactsQuery = z.infer<typeof GetContactsQuerySchema>;

// --- Additional types from contacts.dto.ts (not derivable from Zod schemas) ---
export type CreateContactInput = {
  displayName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  company?: string | null;
  notes?: string | null;
  tags?: string[];
  lifecycleStage?: "lead" | "prospect" | "customer" | "advocate";
};

export type UpdateContactInput = Partial<CreateContactInput>;

export type FetchContactsParams = {
  search?: string;
  sort?: "displayName" | "createdAt";
  order?: "asc" | "desc";
  createdAtFilter?: CreatedAtFilter;
  page?: number;
  pageSize?: number;
};

// Date range helper function (from contacts.ts)
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

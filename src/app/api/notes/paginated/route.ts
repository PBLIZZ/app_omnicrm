import { handleGetWithQueryAuth } from "@/lib/api";
import { z } from "zod";
import { listNotesByContactIdPaginatedService } from "@/server/services/notes.service";
import type { Note } from "@/server/db/schema";

const PaginatedNotesQuerySchema = z.object({
  contactId: z.string().uuid(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
});

const PaginatedNotesResponseSchema = z.object({
  notes: z.array(z.custom<Note>()),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

/**
 * Paginated Notes API - Get notes for a contact with pagination
 */
export const GET = handleGetWithQueryAuth(
  PaginatedNotesQuerySchema,
  PaginatedNotesResponseSchema,
  async (query, userId) => {
    return await listNotesByContactIdPaginatedService(userId, query.contactId, {
      page: query.page,
      pageSize: query.pageSize,
    });
  },
);

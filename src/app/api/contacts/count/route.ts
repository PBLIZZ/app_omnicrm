import { handleGetWithQueryAuth } from "@/lib/api";
import { GetContactsQuerySchema, ContactCountResponseSchema } from "@/server/db/business-schemas";
import { ContactsRepository } from "@repo";
import { isErr } from "@/lib/utils/result";
import type { z } from "zod";

/**
 * Contacts Count API
 *
 * GET: Get total count of contacts with optional filtering
 * Uses existing contacts table with UI terminology transformation
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET
 * ✅ Zod validation and type safety
 */

export const GET = handleGetWithQueryAuth(
  GetContactsQuerySchema,
  ContactCountResponseSchema,
  async (query, userId): Promise<z.infer<typeof ContactCountResponseSchema>> => {
    // Get count using repository
    const result = await ContactsRepository.countContacts(userId, query.search);

    if (isErr(result)) {
      throw new Error(result.error.message);
    }

    return { count: result.data };
  },
);

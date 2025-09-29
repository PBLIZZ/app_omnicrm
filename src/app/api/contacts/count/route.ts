import { handleGetWithQueryAuth } from "@/lib/api";
import { GetContactsQuerySchema, ContactCountResponseSchema } from "@/server/db/business-schemas";
import { ContactsRepository } from "@repo";

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
  async (query, userId) => {
    // Get count using repository
    const total = await ContactsRepository.countContacts(userId, query.search);

    return { count: total };
  },
);

import { handleGetWithQueryAuth } from "@/lib/api";
import { GetOmniClientsQuerySchema, ContactCountResponseSchema } from "@/server/db/business-schemas";
import { ContactsRepository } from "@repo";

/**
 * OmniClients Count API
 *
 * GET: Get total count of clients with optional filtering
 * Uses existing contacts table with UI terminology transformation
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET
 * ✅ Zod validation and type safety
 */

export const GET = handleGetWithQueryAuth(
  GetOmniClientsQuerySchema,
  ContactCountResponseSchema,
  async (query, userId) => {
    // Get count using repository
    const total = await ContactsRepository.countContacts(userId, query.search);

    return { count: total };
  },
);

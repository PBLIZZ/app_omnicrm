import { handleGetWithQueryAuth } from "@/lib/api";
import {
  GetContactsQuerySchema,
  ContactCountResponseSchema,
} from "@/server/db/business-schemas/contacts";
import { countContactsService } from "@/server/services/contacts.service";

/**
 * GET /api/contacts/count - Get total count of contacts
 *
 * Pattern: handleGetWithQueryAuth wrapper → Call service (throws) → Return response
 * Service handles all business logic and throws AppError on failure
 */
export const GET = handleGetWithQueryAuth(
  GetContactsQuerySchema,
  ContactCountResponseSchema,
  async (query, userId): Promise<{ count: number }> => {
    const count = await countContactsService(userId, query.search);
    return { count };
  },
);

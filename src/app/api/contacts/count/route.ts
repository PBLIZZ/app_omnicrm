import { handleGetWithQueryAuth } from "@/lib/api";
import {
  GetContactsQuerySchema,
  ContactCountResponseSchema,
} from "@/server/db/business-schemas/contacts";
import { ContactsRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";

/**
 * GET /api/contacts/count - Get total count of contacts
 *
 * Pattern: handleGetWithQueryAuth wrapper → Call repository → Unwrap DbResult → Return response
 * 
 * Architecture Note: This is a pure database query with NO business logic, NO transforms,
 * and NO orchestration, so it calls the repository directly per the blueprint.
 * Service layer is only for operations that need business logic or data transformation.
 */
export const GET = handleGetWithQueryAuth(
  GetContactsQuerySchema,
  ContactCountResponseSchema,
  async (query, userId): Promise<{ count: number }> => {
    const result = await ContactsRepository.countContacts(userId, query.search);

    if (!result.success) {
      throw new AppError(result.error.message, result.error.code, "database", false);
    }

    return { count: result.data };
  },
);

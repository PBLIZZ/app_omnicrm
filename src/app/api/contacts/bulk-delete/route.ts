import { handleAuth } from "@/lib/api";
import {
  BulkDeleteBodySchema,
  BulkDeleteResponseSchema,
  type BulkDeleteResponse,
} from "@/server/db/business-schemas/contacts";
import { deleteContactsBulk } from "@/server/services/contacts.service";

/**
 * POST /api/contacts/bulk-delete - Delete multiple contacts
 *
 * Pattern: handleAuth wrapper → Call service (throws) → Return response
 * Service handles all business logic and throws AppError on failure
 */
export const POST = handleAuth(
  BulkDeleteBodySchema,
  BulkDeleteResponseSchema,
  async (data, userId): Promise<BulkDeleteResponse> => {
    return await deleteContactsBulk(userId, data);
  },
);

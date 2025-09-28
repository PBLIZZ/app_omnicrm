import { handleAuth } from "@/lib/api";
import { BulkDeleteBodySchema, BulkDeleteResponseSchema } from "@/server/db/business-schemas";
import { BulkDeleteService } from "@/server/services/bulk-delete.service";

/**
 * OmniClients Bulk Delete API
 *
 * POST: Delete multiple clients by IDs
 * Uses existing contacts table with UI terminology transformation
 *
 * Migrated to new auth pattern:
 * ✅ handleAuth for POST
 * ✅ Zod validation and type safety
 */

export const POST = handleAuth(
  BulkDeleteBodySchema,
  BulkDeleteResponseSchema,
  async (data, userId) => {
    // Delegate to service layer (schema already has correct 'ids' field)
    const result = await BulkDeleteService.deleteContacts(userId, data);
    return result;
  },
);

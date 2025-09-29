import { handleAuth } from "@/lib/api";
import { BulkDeleteBodySchema, BulkDeleteResponseSchema } from "@/server/db/business-schemas";
import { deleteContactsBulk } from "@/server/services/contacts.service";
import { isOk, isErr } from "@/lib/utils/result";

/**
 * Contacts Bulk Delete API
 *
 * POST: Delete multiple contacts by IDs
 * Uses existing contacts table with UI terminology transformation
 *
 * Migrated to new auth pattern:
 * ✅ handleAuth for POST
 * ✅ Zod validation and type safety
 */

export const POST = handleAuth(
  BulkDeleteBodySchema,
  BulkDeleteResponseSchema,
  async (data, userId): Promise<{ deleted: number; errors: { id: string; error: string }[] }> => {
    // Delegate to service layer (schema already has correct 'ids' field)
    const result = await deleteContactsBulk(userId, data);

    if (isOk(result)) {
      return result.data;
    }

    if (isErr(result)) {
      throw new Error(result.error.message || "Unknown error occurred");
    }

    throw new Error("Unknown error occurred");
  },
);

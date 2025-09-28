import { handleAuth } from "@/lib/api";
import { BulkEnrichResponseSchema } from "@/server/db/business-schemas";
import { enrichClientsByIds } from "@/server/services/contacts-ai.service";
import { z } from "zod";

/**
 * OmniClients Bulk Enrich API
 *
 * POST: Enrich multiple clients with AI-generated insights, wellness stages, and tags
 * Uses existing contacts table with UI terminology transformation
 *
 * Migrated to new auth pattern:
 * ✅ handleAuth for POST
 * ✅ Zod validation and type safety
 */

// Schema for bulk enrich (same as bulk delete - array of IDs)
const BulkEnrichBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one client ID required"),
});

export const POST = handleAuth(
  BulkEnrichBodySchema,
  BulkEnrichResponseSchema,
  async (data, userId) => {
    // Service expects clientIds parameter name
    const result = await enrichClientsByIds(userId, data.ids);
    return result;
  },
);

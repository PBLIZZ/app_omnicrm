import { z } from "zod";
import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import {
  getContactSuggestionsService,
  createContactsFromSuggestionsService,
} from "@/server/services/contacts.service";
import type { Contact } from "@/server/db/schema";

/**
 * Contact Suggestions API
 *
 * GET: Returns calendar-based contact suggestions
 * POST: Creates contacts from approved suggestions
 *
 * Pattern: handleAuth wrapper → Call service (throws) → Return response
 */

const CreateFromSuggestionsSchema = z.object({
  suggestionIds: z.array(z.string().min(1)).min(1).max(50),
});

const GetSuggestionsQuerySchema = z.object({});

const GetSuggestionsResponseSchema = z.object({
  suggestions: z.array(z.unknown()),
});

const CreateFromSuggestionsResponseSchema = z.object({
  message: z.string(),
  created: z.array(z.unknown()),
});

/**
 * GET /api/contacts/suggestions - Get calendar-based contact suggestions
 */
export const GET = handleGetWithQueryAuth(
  GetSuggestionsQuerySchema,
  GetSuggestionsResponseSchema,
  async (_query, userId): Promise<{ suggestions: Array<unknown> }> => {
    const suggestions = await getContactSuggestionsService(userId);
    return { suggestions };
  },
);

/**
 * POST /api/contacts/suggestions - Create contacts from suggestions
 */
export const POST = handleAuth(
  CreateFromSuggestionsSchema,
  CreateFromSuggestionsResponseSchema,
  async (data, userId): Promise<{ message: string; created: Contact[] }> => {
    const result = await createContactsFromSuggestionsService(userId, data.suggestionIds);
    return {
      message: `Successfully created ${result.createdCount} contacts`,
      created: result.contacts,
    };
  },
);

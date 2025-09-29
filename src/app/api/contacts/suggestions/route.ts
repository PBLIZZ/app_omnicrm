import { z } from "zod";
import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import {
  getContactSuggestions,
  createContactsFromSuggestions,
} from "@/server/services/contacts.service";
import { isErr, isOk } from "@/lib/utils/result";

/**
 * Contacts Suggestions API
 *
 * GET: Returns calendar-based contact suggestions
 * POST: Creates contacts from approved suggestions
 */

const CreateFromSuggestionsSchema = z.object({
  suggestionIds: z.array(z.string().min(1)).min(1).max(50), // Limit to 50 suggestions at once
});

const GetSuggestionsQuerySchema = z.object({});

const GetSuggestionsResponseSchema = z.object({
  suggestions: z.array(z.unknown()),
});

const CreateFromSuggestionsResponseSchema = z.object({
  message: z.string(),
  created: z.array(z.unknown()),
});

export const GET = handleGetWithQueryAuth(
  GetSuggestionsQuerySchema,
  GetSuggestionsResponseSchema,
  async (_query: z.infer<typeof GetSuggestionsQuerySchema>, userId: string) => {
    const result = await getContactSuggestions(userId);

    if (isErr(result)) {
      throw new Error(result.error.message);
    }

    if (!isOk(result)) {
      throw new Error("Invalid result state");
    }

    return {
      suggestions: result.data.suggestions,
    };
  },
);

export const POST = handleAuth(
  CreateFromSuggestionsSchema,
  CreateFromSuggestionsResponseSchema,
  async (data: z.infer<typeof CreateFromSuggestionsSchema>, userId: string) => {
    const result = await createContactsFromSuggestions(userId, data.suggestionIds);

    if (isErr(result)) {
      throw new Error(result.error.message);
    }

    if (!isOk(result)) {
      throw new Error("Invalid result state");
    }

    return {
      message: `Successfully created ${result.data.createdCount} contacts`,
      created: result.data,
    };
  },
);

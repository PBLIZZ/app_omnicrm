/**
 * OmniClients Service - Business logic for all omni-clients endpoints
 */
import { contactSuggestionService } from "@/server/services/contact-suggestion.service";
import { listContactsService, createContactService } from "@/server/services/contacts.service";
import type { ContactSuggestion } from "@/server/services/contact-suggestion.service";
import type { ContactListParams, CreateContactInput } from "@/server/services/contacts.service";
import {
  toOmniClientsWithNotes,
  toOmniClient,
  fromOmniClientInput
} from "@/server/adapters/omniClients";

export type GetContactSuggestionsResult = {
  ok: true;
  data: ContactSuggestion[];
} | {
  ok: false;
  error: string;
  status: number;
};

export type CreateContactsFromSuggestionsResult = {
  ok: true;
  data: {
    success: boolean;
    createdCount: number;
    message: string;
    errors?: string[];
  };
} | {
  ok: false;
  error: string;
  status: number;
};

export interface ListOmniClientsParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

export interface ListOmniClientsResult {
  items: unknown[];
  total: number;
  nextCursor: null;
}

export interface CreateOmniClientResult {
  item: unknown;
}

export class OmniClientsService {
  /**
   * List OmniClients with pagination and search
   */
  static async listOmniClients(userId: string, params: ListOmniClientsParams): Promise<ListOmniClientsResult> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? params.limit ?? 50;
    const sortKey = params.sort ?? "displayName";
    const sortDir = params.order === "desc" ? "desc" : "asc";

    const serviceParams: Parameters<typeof listContactsService>[1] = {
      sort: sortKey as "displayName" | "createdAt" | "updatedAt",
      order: sortDir,
      page,
      pageSize,
    };

    if (params.search) {
      serviceParams.search = params.search;
    }

    const { items, total } = await listContactsService(userId, serviceParams);

    // Transform Contact[] to OmniClientWithNotes[] using adapter
    const omniClients = toOmniClientsWithNotes(items);

    return {
      items: omniClients,
      total,
      nextCursor: null,
    };
  }

  /**
   * Create a new OmniClient
   */
  static async createOmniClient(userId: string, clientData: unknown): Promise<CreateOmniClientResult> {
    // Transform OmniClient input to Contact input using adapter
    const contactInput = fromOmniClientInput(clientData);

    const row = await createContactService(userId, contactInput);

    if (!row) {
      throw new Error("Failed to create client");
    }

    // Transform Contact back to OmniClient for response
    const omniClient = toOmniClient(row);

    return { item: omniClient };
  }

  /**
   * Get contact suggestions from calendar attendees
   */
  static async getContactSuggestions(userId: string): Promise<GetContactSuggestionsResult> {
    try {
      // Get contact suggestions from calendar attendees
      const suggestions = await contactSuggestionService.getContactSuggestions(userId);

      return {
        ok: true,
        data: suggestions,
      };
    } catch (error) {
      console.error("Failed to fetch contact suggestions:", error);
      return {
        ok: false,
        error: "Failed to fetch contact suggestions",
        status: 500,
      };
    }
  }

  /**
   * Create contacts from approved suggestions
   */
  static async createContactsFromSuggestions(
    userId: string,
    suggestionIds: string[]
  ): Promise<CreateContactsFromSuggestionsResult> {
    try {
      // Create contacts from suggestions
      const result = await contactSuggestionService.createContactsFromSuggestions(
        userId,
        suggestionIds
      );

      if (!result.success && result.createdCount === 0) {
        console.error("Failed to create clients from suggestions:", {
          userId,
          suggestionIds,
          result,
        });
        return {
          ok: false,
          error: "Failed to create clients",
          status: 400,
        };
      }

      return {
        ok: true,
        data: {
          success: result.success,
          createdCount: result.createdCount,
          message: `Successfully created ${result.createdCount} OmniClient${result.createdCount === 1 ? "" : "s"}`,
          errors: result.errors.length > 0 ? result.errors : undefined,
        },
      };
    } catch (error) {
      console.error("Failed to create contacts from suggestions:", error);
      return {
        ok: false,
        error: "Failed to create contacts from suggestions",
        status: 500,
      };
    }
  }
}
/**
 * Core Contact Hooks (Injectable, Testable)
 *
 * These hooks accept an API client as a parameter, making them easy to test
 * without module mocks. The hooks are thin wrappers around React Query
 * with minimal configuration.
 */

import { useQuery, useMutation, type QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";
import { toast } from "sonner";
import type {
  Contact,
  ContactListResponse,
  ContactWithLastNote,
} from "@/server/db/business-schemas/contacts";

// ============================================================================
// API CLIENT INTERFACE
// ============================================================================

/**
 * Minimal API client interface for dependency injection
 */
export interface ApiClient {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data: unknown): Promise<T>;
  put<T>(url: string, data: unknown): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

// ============================================================================
// TYPES
// ============================================================================

export type { Contact, ContactWithLastNote };

export interface ContactSuggestion {
  id: string;
  displayName: string;
  email: string;
  source: string;
  confidence: string;
  eventCount: number;
  lastEventDate: string;
  eventTitles: string[];
}

interface ContactSuggestionsResponse {
  suggestions: ContactSuggestion[];
}

// ============================================================================
// QUERY HOOKS (Injectable)
// ============================================================================

/**
 * GET /api/contacts - List contacts with pagination and filters
 *
 * @param api - API client instance (injected for testability)
 * @param searchQuery - Optional search term
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 */
export function useContactsCore(
  api: ApiClient,
  searchQuery: string = "",
  page: number = 1,
  pageSize: number = 25,
) {
  return useQuery({
    queryKey: queryKeys.contacts.list({ search: searchQuery, page, pageSize }),
    queryFn: async (): Promise<{ items: ContactWithLastNote[]; total: number }> => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const data = await api.get<ContactListResponse>(`/api/contacts?${params.toString()}`);

      return {
        items: data.items,
        total: data.pagination.total,
      };
    },
    // Simplified: let test QueryClient or consumer control these
    onError: (err: unknown) => {
      toast.error("Failed to load contacts. Please try again.");
      if (err instanceof Error) {
        console.error("Contacts fetch error:", err);
      }
    },
  });
}

/**
 * GET /api/contacts/suggestions - Calendar-based contact suggestions
 */
export function useContactSuggestionsCore(api: ApiClient, enabled: boolean = true) {
  return useQuery({
    queryKey: ["/api/contacts/suggestions"],
    queryFn: async (): Promise<ContactSuggestion[]> => {
      const data = await api.get<ContactSuggestionsResponse>("/api/contacts/suggestions");
      return data.suggestions;
    },
    enabled,
    onError: (error: unknown) => {
      toast.error("Failed to load contact suggestions", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    },
  });
}

/**
 * GET /api/contacts/:id - Fetch a single contact by ID
 */
export function useContactCore(api: ApiClient, id: string) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: async (): Promise<Contact> => {
      return await api.get<Contact>(`/api/contacts/${id}`);
    },
    enabled: !!id,
    onError: (error: unknown) => {
      toast.error("Failed to load contact", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    },
  });
}

// ============================================================================
// MUTATION HOOKS (Injectable)
// ============================================================================

/**
 * POST /api/contacts - Create a new contact
 */
export function useCreateContactCore(api: ApiClient, queryClient: QueryClient) {
  return useMutation({
    mutationFn: async (
      input: Omit<Contact, "id" | "userId" | "createdAt" | "updatedAt">,
    ): Promise<Contact> => {
      return await api.post<Contact>("/api/contacts", {
        ...input,
        source: input.source ?? "manual",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

/**
 * PUT /api/contacts/:id - Update an existing contact
 */
export function useUpdateContactCore(api: ApiClient, queryClient: QueryClient) {
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<Omit<Contact, "id" | "userId" | "createdAt" | "updatedAt">>;
    }): Promise<Contact> => {
      return await api.put<Contact>(`/api/contacts/${id}`, input);
    },
    onSuccess: (updatedContact) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.detail(updatedContact.id),
      });
    },
  });
}

/**
 * DELETE /api/contacts/:id - Delete single contact
 */
export function useDeleteContactCore(api: ApiClient, queryClient: QueryClient) {
  return useMutation({
    mutationFn: async (contactId: string): Promise<void> => {
      await api.delete<{ deleted: number }>(`/api/contacts/${contactId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

/**
 * POST /api/contacts/bulk-delete - Delete multiple contacts by IDs
 */
export function useDeleteContactsCore(api: ApiClient, queryClient: QueryClient) {
  return useMutation({
    mutationFn: async (ids: string[]): Promise<number> => {
      const result = await api.post<{ deleted: number }>("/api/contacts/bulk-delete", {
        ids,
      });
      return result.deleted;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

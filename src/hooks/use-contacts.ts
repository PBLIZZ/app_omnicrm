import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import type {
  Contact,
  ContactListResponse,
  ContactWithLastNote,
} from "@/server/db/business-schemas/contacts";

// Re-export types for components
export type { Contact, ContactWithLastNote };

// This matches the actual API response from /api/contacts/suggestions
// which calls getContactSuggestions() from suggest-contacts.ts
export interface ContactSuggestion {
  id: string;
  displayName: string;
  email: string; // API returns 'email', not 'primaryEmail'
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
// QUERIES
// ============================================================================

/**
 * GET /api/contacts - List contacts with pagination and filters
 */
export function useContacts(searchQuery: string, page = 1, pageSize = 25) {
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

      // apiClient returns unwrapped data directly
      const data = await apiClient.get<ContactListResponse>(`/api/contacts?${params.toString()}`);

      return {
        items: data.items,
        total: data.pagination.total,
      };
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });
}

/**
 * GET /api/contacts/suggestions - Calendar-based contact suggestions
 */
export function useContactSuggestions(enabled = true) {
  return useQuery({
    queryKey: ["/api/contacts/suggestions"],
    queryFn: async (): Promise<ContactSuggestion[]> => {
      const data = await apiClient.get<ContactSuggestionsResponse>("/api/contacts/suggestions");
      return data.suggestions;
    },
    enabled,
  });
}

/**
 * GET /api/contacts/:id - Fetch a single contact by ID
 * Returns ContactWithNotes (includes full notes array)
 */
export function useContact(id: string) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: async (): Promise<Contact> => {
      return await apiClient.get<Contact>(`/api/contacts/${id}`);
    },
    enabled: !!id,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * POST /api/contacts - Create a new contact
 */
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<Contact, "id" | "userId" | "createdAt" | "updatedAt">,
    ): Promise<Contact> => {
      return await apiClient.post<Contact>("/api/contacts", {
        ...input,
        source: input.source ?? "manual",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      toast.success("Contact created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create contact", {
        description: error.message,
      });
    },
  });
}

/**
 * PUT /api/contacts/:id - Update an existing contact
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<Omit<Contact, "id" | "userId" | "createdAt" | "updatedAt">>;
    }): Promise<Contact> => {
      return await apiClient.put<Contact>(`/api/contacts/${id}`, input);
    },
    onSuccess: (updatedContact) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.detail(updatedContact.id),
      });
      toast.success("Contact updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update contact", {
        description: error.message,
      });
    },
  });
}

/**
 * DELETE /api/contacts/:id - Delete single contact
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string): Promise<void> => {
      await apiClient.delete<{ deleted: number }>(`/api/contacts/${contactId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      toast.success("Contact deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete contact", {
        description: error.message,
      });
    },
  });
}

/**
 * POST /api/contacts/bulk-delete - Delete multiple contacts by IDs
 */
export function useDeleteContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]): Promise<number> => {
      const result = await apiClient.post<{ deleted: number }>("/api/contacts/bulk-delete", {
        ids,
      });
      return result.deleted;
    },
    onSuccess: (deletedCount) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      toast.success("Contacts deleted", {
        description: `${deletedCount} contact${deletedCount === 1 ? "" : "s"} deleted successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete contacts", {
        description: error.message,
      });
    },
  });
}

/**
 * POST /api/contacts/suggestions - Create contacts from suggestions
 */
export function useCreateContactsFromSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      suggestionIds: string[],
    ): Promise<{ message: string; created: Contact[] }> => {
      return await apiClient.post<{ message: string; created: Contact[] }>(
        "/api/contacts/suggestions",
        { suggestionIds },
      );
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error("Failed to create contacts", {
        description: error.message,
      });
    },
  });
}

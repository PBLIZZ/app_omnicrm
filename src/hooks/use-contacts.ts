import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { Result, isErr } from "@/lib/utils/result";
import type {
  Contact,
  ContactListResponse,
  ContactWithLastNote,
  CreateContact,
  UpdateContact,
} from "@/server/db/business-schemas/contacts";

import { ContactWithNotes } from "@/server/db/schema";

// Re-export types for components
export type { Contact, ContactWithNotes, ContactWithLastNote };

// Define suggestion types locally since they're not in the schema
export interface ContactSuggestion {
  id: string;
  displayName: string;
  primaryEmail: string;
  source: string;
  confidence: string;
  aiInsights?: {
    lifecycleStage: string;
    tags: string[];
    summary: string;
  };
  calendarEvents?: Array<{
    title: string;
    startTime: string;
    eventType: string;
  }>;
}

interface ContactSuggestionsResponse {
  suggestions: ContactSuggestion[];
}

interface ContactResponse {
  item: Contact;
}

interface BulkDeleteResponse {
  deleted: number;
}

// ============================================================================
// QUERIES
// ============================================================================

// GET /api/contacts - List contacts with pagination and filters
export function useContacts(
  searchQuery: string,
  page = 1,
  pageSize = 25, // Default to 25 for better performance
): ReturnType<typeof useQuery<{ items: ContactWithLastNote[]; total: number }>> {
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

      // apiClient automatically unwraps { success: true, data: T } → returns T directly
      const data = await apiClient.get<ContactListResponse>(`/api/contacts?${params.toString()}`);

      return {
        items: data.items, // items now includes lastNote field
        total: data.pagination.total,
      };
    },
    // Smart caching strategy for 300-3000 contacts:
    // - Fetch all contacts once (pageSize=3000)
    // - Cache for 30 minutes to minimize API calls
    // - Only refetch on window focus if data is stale (>30 min)
    // - Mutations manually invalidate to force refetch
    staleTime: 30 * 60 * 1000, // 30 minutes - data stays fresh
    gcTime: 60 * 60 * 1000, // 1 hour - keep in memory
    refetchOnWindowFocus: true, // Refetch on tab focus (respects staleTime)
    refetchOnMount: false, // Don't refetch on component remount (use cache)
  });
}

// GET /api/contacts/suggestions - Calendar-based contact suggestions
export function useContactSuggestions(
  enabled = true,
): ReturnType<typeof useQuery<ContactSuggestion[]>> {
  return useQuery({
    queryKey: ["/api/contacts/suggestions"],
    queryFn: async (): Promise<ContactSuggestion[]> => {
      const data = await apiClient.get<ContactSuggestionsResponse>("/api/contacts/suggestions");
      return data.suggestions;
    },
    enabled,
  });
}

// GET /api/contacts/:id - Fetch a single contact by ID
export function useContact(id: string) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: async (): Promise<Contact> => {
      const result = await apiClient.get<
        Result<ContactResponse, { message: string; code: string }>
      >(`/api/contacts/${id}`);
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
      if (!result.success) {
        throw new Error("Invalid result state");
      }
      return result.data.item;
    },
    enabled: !!id,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

// POST /api/contacts - Create a new contact
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreateContact, "userId">): Promise<Contact> => {
      const result = await apiClient.post<
        Result<ContactResponse, { message: string; code: string }>
      >("/api/contacts", {
        ...input,
        source: input.source ?? "manual",
      });
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
      if (!result.success) {
        throw new Error("Invalid result state");
      }
      return result.data.item;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      toast.success("Contact created", {
        description: "The contact has been added successfully.",
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to create contact", {
        description: errorMessage,
      });
    },
  });
}

// PUT /api/contacts/:id - Update an existing contact
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateContact }): Promise<Contact> => {
      const result = await apiClient.put<
        Result<ContactResponse, { message: string; code: string }>
      >(`/api/contacts/${id}`, input);
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
      if (!result.success) {
        throw new Error("Invalid result state");
      }
      return result.data.item;
    },
    onSuccess: (updatedContact) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.detail(updatedContact.id),
      });
      toast.success("Contact updated", {
        description: "The contact has been updated successfully.",
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to update contact", {
        description: errorMessage,
      });
    },
  });
}

// POST /api/contacts/bulk-delete - Delete multiple contacts by IDs
export function useDeleteContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]): Promise<number> => {
      const result = await apiClient.post<
        Result<BulkDeleteResponse, { message: string; code: string }>
      >("/api/contacts/bulk-delete", { ids });
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
      if (!result.success) {
        throw new Error("Invalid result state");
      }
      return result.data.deleted;
    },
    onSuccess: (deletedCount) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      toast.success("Contacts deleted", {
        description: `${deletedCount} contact${deletedCount === 1 ? "" : "s"} deleted successfully.`,
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to delete contacts", {
        description: errorMessage,
      });
    },
  });
}

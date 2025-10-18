/**
 * Contact Hooks (Production wrappers with toasts + concrete apiClient)
 *
 * These hooks wrap the core injectable hooks and add:
 * - Toast notifications for user feedback
 * - Concrete apiClient injection
 * - Production-appropriate caching strategies
 *
 * For testing, use the core hooks from `use-contacts-core.ts` instead.
 */

import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import {
  useContactsCore,
  useContactSuggestionsCore,
  useContactCore,
  useCreateContactCore,
  useUpdateContactCore,
  useDeleteContactCore,
  useDeleteContactsCore,
  type Contact,
  type ContactSuggestion,
} from "./use-contacts-core";
import type { ContactWithLastNote } from "@/server/db/business-schemas/contacts";

// Re-export types for components
export type { Contact, ContactWithLastNote, ContactSuggestion };

// ============================================================================
// PRODUCTION QUERY HOOKS (with apiClient injection + caching)
// ============================================================================

/**
 * GET /api/contacts - List contacts with pagination and filters
 */
export function useContacts(searchQuery: string = "", page: number = 1, pageSize: number = 25) {
  return useContactsCore(apiClient, searchQuery, page, pageSize);
}

/**
 * GET /api/contacts/suggestions - Calendar-based contact suggestions
 */
export function useContactSuggestions(enabled: boolean = true) {
  return useContactSuggestionsCore(apiClient, enabled);
}

/**
 * GET /api/contacts/:id - Fetch a single contact by ID
 */
export function useContact(id: string) {
  return useContactCore(apiClient, id);
}

// ============================================================================
// PRODUCTION MUTATION HOOKS (with toasts)
// ============================================================================

/**
 * POST /api/contacts - Create a new contact
 */
export function useCreateContact() {
  const queryClient = useQueryClient();
  const mutation = useCreateContactCore(apiClient, queryClient);

  // Wrap mutation to add toasts
  return {
    ...mutation,
    mutate: (
      input: Parameters<typeof mutation.mutate>[0],
      options?: Parameters<typeof mutation.mutate>[1],
    ) => {
      mutation.mutate(input, {
        ...options,
        onSuccess: (data, variables, context, meta) => {
          toast.success("Contact created successfully");
          options?.onSuccess?.(data, variables, context, meta);
        },
        onError: (error, variables, context, meta) => {
          toast.error("Failed to create contact", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
          options?.onError?.(error, variables, context, meta);
        },
      });
    },
    mutateAsync: async (
      input: Parameters<typeof mutation.mutateAsync>[0],
      options?: Parameters<typeof mutation.mutateAsync>[1],
    ) => {
      try {
        const result = await mutation.mutateAsync(input, options);
        toast.success("Contact created successfully");
        return result;
      } catch (error) {
        toast.error("Failed to create contact", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  };
}

/**
 * PUT /api/contacts/:id - Update an existing contact
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();
  const mutation = useUpdateContactCore(apiClient, queryClient);

  return {
    ...mutation,
    mutate: (
      input: Parameters<typeof mutation.mutate>[0],
      options?: Parameters<typeof mutation.mutate>[1],
    ) => {
      mutation.mutate(input, {
        ...options,
        onSuccess: (data, variables, context, meta) => {
          toast.success("Contact updated successfully");
          options?.onSuccess?.(data, variables, context, meta);
        },
        onError: (error, variables, context, meta) => {
          toast.error("Failed to update contact", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
          options?.onError?.(error, variables, context, meta);
        },
      });
    },
    mutateAsync: async (
      input: Parameters<typeof mutation.mutateAsync>[0],
      options?: Parameters<typeof mutation.mutateAsync>[1],
    ) => {
      try {
        const result = await mutation.mutateAsync(input, options);
        toast.success("Contact updated successfully");
        return result;
      } catch (error) {
        toast.error("Failed to update contact", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  };
}

/**
 * DELETE /api/contacts/:id - Delete single contact
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();
  const mutation = useDeleteContactCore(apiClient, queryClient);

  return {
    ...mutation,
    mutate: (contactId: string, options?: Parameters<typeof mutation.mutate>[1]) => {
      mutation.mutate(contactId, {
        ...options,
        onSuccess: (data, variables, context, meta) => {
          toast.success("Contact deleted successfully");
          options?.onSuccess?.(data, variables, context, meta);
        },
        onError: (error, variables, context, meta) => {
          toast.error("Failed to delete contact", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
          options?.onError?.(error, variables, context, meta);
        },
      });
    },
    mutateAsync: async (
      contactId: string,
      options?: Parameters<typeof mutation.mutateAsync>[1],
    ) => {
      try {
        const result = await mutation.mutateAsync(contactId, options);
        toast.success("Contact deleted successfully");
        return result;
      } catch (error) {
        toast.error("Failed to delete contact", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  };
}

/**
 * POST /api/contacts/bulk-delete - Delete multiple contacts by IDs
 */
export function useDeleteContacts() {
  const queryClient = useQueryClient();
  const mutation = useDeleteContactsCore(apiClient, queryClient);

  return {
    ...mutation,
    mutate: (ids: string[], options?: Parameters<typeof mutation.mutate>[1]) => {
      mutation.mutate(ids, {
        ...options,
        onSuccess: (deletedCount, variables, context, meta) => {
          toast.success("Contacts deleted", {
            description: `${deletedCount} contact${deletedCount === 1 ? "" : "s"} deleted successfully.`,
          });
          options?.onSuccess?.(deletedCount, variables, context, meta);
        },
        onError: (error, variables, context, meta) => {
          toast.error("Failed to delete contacts", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
          options?.onError?.(error, variables, context, meta);
        },
      });
    },
    mutateAsync: async (ids: string[], options?: Parameters<typeof mutation.mutateAsync>[1]) => {
      try {
        const result = await mutation.mutateAsync(ids, options);
        toast.success("Contacts deleted", {
          description: `${result} contact${result === 1 ? "" : "s"} deleted successfully.`,
        });
        return result;
      } catch (error) {
        toast.error("Failed to delete contacts", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  };
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
    onSuccess: (data: { message: string; created: Contact[] }) => {
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

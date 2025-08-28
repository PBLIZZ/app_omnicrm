import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchDelete, fetchPost } from '@/lib/api';

/**
 * Hook to delete a single contact
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      return await fetchDelete(`/api/contacts/${contactId}`);
    },
    onSuccess: () => {
      toast.success('Contact deleted successfully');
      // Invalidate contacts queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/contacts-new'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error) => {
      console.error('Delete contact error:', error);
      toast.error('Failed to delete contact: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}

/**
 * Hook to delete multiple contacts in bulk
 */
export function useBulkDeleteContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      return await fetchPost<{ deleted: number }>('/api/contacts/bulk-delete', { ids: contactIds });
    },
    onSuccess: (data) => {
      toast.success(`Successfully deleted ${data.deleted} contact(s)`);
      // Invalidate contacts queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/contacts-new'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error) => {
      console.error('Bulk delete contacts error:', error);
      toast.error('Failed to delete contacts: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}
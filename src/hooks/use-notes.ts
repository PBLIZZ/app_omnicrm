import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
// Direct retry logic (no abstraction)
const shouldRetry = (error: unknown, retryCount: number): boolean => {
  // Don't retry auth errors (401, 403)
  if (error instanceof Error && error.message.includes("401")) return false;
  if (error instanceof Error && error.message.includes("403")) return false;

  // Retry network errors up to 3 times
  if (error instanceof Error && (error.message.includes("fetch") || error.message.includes("network"))) {
    return retryCount < 3;
  }

  // Retry other errors up to 2 times
  return retryCount < 2;
};
import type { Note } from "@/server/db/types";

interface UseNotesOptions {
  contactId: string;
}

interface CreateNoteData {
  content: string;
}

interface UpdateNoteData {
  noteId: string;
  content: string;
}

interface DeleteNoteData {
  noteId: string;
}

interface UseNotesReturn {
  notes: Note[];
  isLoading: boolean;
  error: unknown;
  createNote: (data: CreateNoteData) => void;
  updateNote: (data: UpdateNoteData) => void;
  deleteNote: (data: DeleteNoteData) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  refetch: () => Promise<{ data: Note[] | undefined; error: unknown }>;
}

export function useNotes({ contactId }: UseNotesOptions): UseNotesReturn {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Define API response type for notes
  interface NotesApiResponse {
    notes: Note[];
  }

  // Fetch notes for a contact
  const notesQuery = useQuery({
    queryKey: queryKeys.contacts.notes(contactId),
    queryFn: async (): Promise<Note[]> => {
      const data = await apiClient.get<NotesApiResponse>(`/api/contacts-new/${contactId}/notes`);
      return data.notes ?? [];
    },
    enabled: !!contactId,
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Create new note
  const createNoteMutation = useMutation({
    mutationFn: async (data: CreateNoteData): Promise<Note> => {
      const result = await apiClient.post<{ note: Note }>(
        `/api/contacts-new/${contactId}/notes`,
        data,
      );
      return result.note;
    },
    onMutate: async (newNote) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts.notes(contactId) });

      // Snapshot the previous value
      const previousNotes = queryClient.getQueryData<Note[]>(queryKeys.contacts.notes(contactId));

      // Optimistically update with temporary note
      const tempNote: Note = {
        id: `temp-${Date.now()}`,
        userId: "", // Will be set by server
        contactId,
        title: null, // Optional title field
        content: newNote.content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      queryClient.setQueryData<Note[]>(queryKeys.contacts.notes(contactId), (old) => [
        tempNote,
        ...(old ?? []),
      ]);

      return { previousNotes };
    },
    onError: (error, variables, context) => {
      void error;
      void variables;
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(queryKeys.contacts.notes(contactId), context.previousNotes);
      }
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      });
    },
    onSuccess: (newNote) => {
      // Replace temp note with real note from server
      queryClient.setQueryData<Note[]>(queryKeys.contacts.notes(contactId), (old) => {
        if (!old) return [newNote];
        return old.map((note) => (note.id.startsWith("temp-") ? newNote : note));
      });
      // Invalidate all contacts queries to update notes count
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list(), exact: false });
      toast({
        title: "Success",
        description: "Note created successfully",
      });
    },
  });

  // Update existing note
  const updateNoteMutation = useMutation({
    mutationFn: async (data: UpdateNoteData): Promise<void> => {
      await apiClient.put(`/api/contacts-new/${contactId}/notes/${data.noteId}`, {
        content: data.content,
      });
    },
    onMutate: async (updatedNote) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts.notes(contactId) });

      const previousNotes = queryClient.getQueryData<Note[]>(queryKeys.contacts.notes(contactId));

      // Optimistically update
      queryClient.setQueryData<Note[]>(queryKeys.contacts.notes(contactId), (old) => {
        if (!old) return [];
        return old.map((note) =>
          note.id === updatedNote.noteId
            ? { ...note, content: updatedNote.content, updatedAt: new Date() }
            : note,
        );
      });

      return { previousNotes };
    },
    onError: (error, variables, context) => {
      void error;
      void variables;
      if (context?.previousNotes) {
        queryClient.setQueryData(queryKeys.contacts.notes(contactId), context.previousNotes);
      }
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.notes(contactId) });
      toast({
        title: "Success",
        description: "Note updated successfully",
      });
    },
  });

  // Delete note
  const deleteNoteMutation = useMutation({
    mutationFn: async (data: DeleteNoteData): Promise<void> => {
      await apiClient.delete(`/api/contacts-new/${contactId}/notes/${data.noteId}`);
    },
    onMutate: async (deletedNote) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts.notes(contactId) });

      const previousNotes = queryClient.getQueryData<Note[]>(queryKeys.contacts.notes(contactId));

      // Optimistically remove note
      queryClient.setQueryData<Note[]>(queryKeys.contacts.notes(contactId), (old) => {
        if (!old) return [];
        return old.filter((note) => note.id !== deletedNote.noteId);
      });

      return { previousNotes };
    },
    onError: (error, variables, context) => {
      void error;
      void variables;
      if (context?.previousNotes) {
        queryClient.setQueryData(queryKeys.contacts.notes(contactId), context.previousNotes);
      }
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidate all contacts queries to update notes count
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list(), exact: false });
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
    },
  });

  return {
    notes: notesQuery.data ?? [],
    isLoading: notesQuery.isLoading,
    error: notesQuery.error,
    createNote: createNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    isCreating: createNoteMutation.isPending,
    isUpdating: updateNoteMutation.isPending,
    isDeleting: deleteNoteMutation.isPending,
    refetch: async (): Promise<{ data: Note[] | undefined; error: unknown }> => {
      const result = await notesQuery.refetch();
      return {
        data: result.data,
        error: result.error,
      };
    },
  };
}

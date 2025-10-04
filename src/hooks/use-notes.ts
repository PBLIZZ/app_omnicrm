import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api/client";
// Direct retry logic (no abstraction)
const shouldRetry = (error: unknown, retryCount: number): boolean => {
  // Don't retry auth errors (401, 403)
  if (error instanceof Error && error.message.includes("401")) return false;
  if (error instanceof Error && error.message.includes("403")) return false;

  // Retry network errors up to 3 times
  if (
    error instanceof Error &&
    (error.message.includes("fetch") || error.message.includes("network"))
  ) {
    return retryCount < 3;
  }

  // Retry other errors up to 2 times
  return retryCount < 2;
};
import type { Note } from "@/server/db/schema";

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

  // Fetch notes for a contact
  const notesQuery = useQuery({
    queryKey: ["/api/notes", contactId],
    queryFn: async (): Promise<Note[]> => {
      // apiClient automatically unwraps { success: true, data: T } → returns T
      const notes = await apiClient.get<Note[]>(`/api/notes?contactId=${contactId}`);
      return notes ?? [];
    },
    enabled: !!contactId,
    retry: (failureCount, error) => shouldRetry(error, failureCount),
    staleTime: 30 * 60 * 1000, // 30 minutes - data stays fresh and won't refetch
    gcTime: 35 * 60 * 1000, // 35 minutes - cache persists slightly longer than staleTime
  });

  // Create new note
  const createNoteMutation = useMutation({
    mutationFn: async (data: CreateNoteData): Promise<Note> => {
      // apiClient automatically unwraps { success: true, data: T } → returns T
      const note = await apiClient.post<Note>("/api/notes", {
        contactId,
        contentPlain: data.content,
        sourceType: "typed" as const,
      });
      return note;
    },
    onMutate: async (newNote) => {
      await queryClient.cancelQueries({ queryKey: ["/api/notes", contactId] });

      const previousNotes = queryClient.getQueryData<Note[]>(["/api/notes", contactId]);

      // Optimistically update with temporary note
      const tempNote: Note = {
        id: `temp-${Date.now()}`,
        userId: "",
        contactId,
        contentPlain: newNote.content,
        contentRich: {},
        tags: [],
        piiEntities: [],
        sourceType: "typed",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      queryClient.setQueryData<Note[]>(["/api/notes", contactId], (old) => [
        tempNote,
        ...(old ?? []),
      ]);

      return { previousNotes };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["/api/notes", contactId], context.previousNotes);
      }
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      });
    },
    onSuccess: (newNote) => {
      // Update cache with real note (replace temp note)
      queryClient.setQueryData<Note[]>(["/api/notes", contactId], (old) => {
        if (!old) return [newNote];
        return old.map((note) => (note.id.startsWith("temp-") ? newNote : note));
      });
      // Don't invalidate - we just set the correct data above
      toast({
        title: "Success",
        description: "Note created successfully",
      });
    },
  });

  // Update existing note
  const updateNoteMutation = useMutation({
    mutationFn: async (data: UpdateNoteData): Promise<Note> => {
      // apiClient automatically unwraps { success: true, data: T } → returns T
      const note = await apiClient.put<Note>(`/api/notes/${data.noteId}`, {
        contentPlain: data.content,
      });
      return note;
    },
    onMutate: async (updatedNote) => {
      await queryClient.cancelQueries({ queryKey: ["/api/notes", contactId] });

      const previousNotes = queryClient.getQueryData<Note[]>(["/api/notes", contactId]);

      queryClient.setQueryData<Note[]>(["/api/notes", contactId], (old) => {
        if (!old) return [];
        return old.map((note) =>
          note.id === updatedNote.noteId
            ? { ...note, contentPlain: updatedNote.content, updatedAt: new Date() }
            : note,
        );
      });

      return { previousNotes };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["/api/notes", contactId], context.previousNotes);
      }
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Optimistic update already applied in onMutate, no need to invalidate
      toast({
        title: "Success",
        description: "Note updated successfully",
      });
    },
  });

  // Delete note
  const deleteNoteMutation = useMutation({
    mutationFn: async (data: DeleteNoteData): Promise<{ deleted: boolean }> => {
      // apiClient automatically unwraps { success: true, data: T } → returns T
      const result = await apiClient.delete<{ deleted: boolean }>(`/api/notes/${data.noteId}`);
      return result;
    },
    onMutate: async (deletedNote) => {
      await queryClient.cancelQueries({ queryKey: ["/api/notes", contactId] });

      const previousNotes = queryClient.getQueryData<Note[]>(["/api/notes", contactId]);

      queryClient.setQueryData<Note[]>(["/api/notes", contactId], (old) => {
        if (!old) return [];
        return old.filter((note) => note.id !== deletedNote.noteId);
      });

      return { previousNotes };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["/api/notes", contactId], context.previousNotes);
      }
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Optimistic update already applied in onMutate, no need to invalidate
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

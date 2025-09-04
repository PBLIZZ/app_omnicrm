import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { fetchPost, fetchPut, fetchDelete } from "@/lib/api";
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
  error: Error | null;
  createNote: (data: CreateNoteData) => void;
  updateNote: (data: UpdateNoteData) => void;
  deleteNote: (data: DeleteNoteData) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  refetch: () => Promise<{ data: Note[] | undefined; error: Error | null }>;
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
    queryKey: ["contacts", contactId, "notes"],
    queryFn: async (): Promise<Note[]> => {
      const response = await fetch(`/api/contacts-new/${contactId}/notes`);
      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }
      const data: NotesApiResponse = (await response.json()) as NotesApiResponse;
      return data.notes ?? [];
    },
    enabled: !!contactId,
  });

  // Create new note
  const createNoteMutation = useMutation({
    mutationFn: async (data: CreateNoteData): Promise<Note> => {
      const result = await fetchPost<{ note: Note }>(`/api/contacts-new/${contactId}/notes`, data);
      return result.note;
    },
    onMutate: async (newNote) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["contacts", contactId, "notes"] });

      // Snapshot the previous value
      const previousNotes = queryClient.getQueryData<Note[]>(["contacts", contactId, "notes"]);

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

      queryClient.setQueryData<Note[]>(["contacts", contactId, "notes"], (old) => [
        tempNote,
        ...(old ?? []),
      ]);

      return { previousNotes };
    },
    onError: (_, _variables, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(["contacts", contactId, "notes"], context.previousNotes);
      }
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      });
    },
    onSuccess: (newNote) => {
      // Replace temp note with real note from server
      queryClient.setQueryData<Note[]>(["contacts", contactId, "notes"], (old) => {
        if (!old) return [newNote];
        return old.map((note) => (note.id.startsWith("temp-") ? newNote : note));
      });
      // Invalidate all contacts queries to update notes count
      void queryClient.invalidateQueries({ queryKey: ["/api/contacts-new"], exact: false });
      toast({
        title: "Success",
        description: "Note created successfully",
      });
    },
  });

  // Update existing note
  const updateNoteMutation = useMutation({
    mutationFn: async (data: UpdateNoteData): Promise<void> => {
      await fetchPut(`/api/contacts-new/${contactId}/notes/${data.noteId}`, {
        content: data.content,
      });
    },
    onMutate: async (updatedNote) => {
      await queryClient.cancelQueries({ queryKey: ["contacts", contactId, "notes"] });

      const previousNotes = queryClient.getQueryData<Note[]>(["contacts", contactId, "notes"]);

      // Optimistically update
      queryClient.setQueryData<Note[]>(["contacts", contactId, "notes"], (old) => {
        if (!old) return [];
        return old.map((note) =>
          note.id === updatedNote.noteId
            ? { ...note, content: updatedNote.content, updatedAt: new Date() }
            : note,
        );
      });

      return { previousNotes };
    },
    onError: (_, _variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["contacts", contactId, "notes"], context.previousNotes);
      }
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contacts", contactId, "notes"] });
      toast({
        title: "Success",
        description: "Note updated successfully",
      });
    },
  });

  // Delete note
  const deleteNoteMutation = useMutation({
    mutationFn: async (data: DeleteNoteData): Promise<void> => {
      await fetchDelete(`/api/contacts-new/${contactId}/notes/${data.noteId}`);
    },
    onMutate: async (deletedNote) => {
      await queryClient.cancelQueries({ queryKey: ["contacts", contactId, "notes"] });

      const previousNotes = queryClient.getQueryData<Note[]>(["contacts", contactId, "notes"]);

      // Optimistically remove note
      queryClient.setQueryData<Note[]>(["contacts", contactId, "notes"], (old) => {
        if (!old) return [];
        return old.filter((note) => note.id !== deletedNote.noteId);
      });

      return { previousNotes };
    },
    onError: (_, _variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["contacts", contactId, "notes"], context.previousNotes);
      }
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidate all contacts queries to update notes count
      void queryClient.invalidateQueries({ queryKey: ["/api/contacts-new"], exact: false });
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
    refetch: async (): Promise<{ data: Note[] | undefined; error: Error | null }> => {
      const result = await notesQuery.refetch();
      return {
        data: result.data,
        error: result.error,
      };
    },
  };
}

/**
 * Notes Hooks Tests (using MSW)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClientWrapper } from "@packages/testing";
import { useNotes } from "../use-notes";

// Mock toast
vi.mock("../use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("useNotes (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  describe("Query Operations", () => {
    it("fetches notes for a contact", async () => {
      const { result } = renderHook(() => useNotes({ contactId: "contact-1" }), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.notes).toHaveLength(2);
      expect(result.current.notes[0].contentPlain).toBe("First note about the client");
      expect(result.current.notes[1].contentPlain).toBe("Follow-up needed");
    });

    it("returns empty array while loading", () => {
      const { result } = renderHook(() => useNotes({ contactId: "contact-1" }), { wrapper });

      expect(result.current.notes).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it("does not fetch when contactId is empty", () => {
      const { result } = renderHook(() => useNotes({ contactId: "" }), { wrapper });

      expect(result.current.notes).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("provides refetch function", async () => {
      const { result } = renderHook(() => useNotes({ contactId: "contact-1" }), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const refetchResult = await result.current.refetch();
      expect(refetchResult.data).toHaveLength(2);
      expect(refetchResult.error).toBeNull();
    });
  });

  describe("Create Note", () => {
    it("creates a new note successfully", async () => {
      const { result } = renderHook(() => useNotes({ contactId: "contact-1" }), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.createNote({ content: "New test note" });

      await waitFor(() => expect(result.current.isCreating).toBe(false));

      // Note should be created
      const newNote = result.current.notes.find((n) => n.contentPlain === "New test note");
      expect(newNote).toBeDefined();
      expect(newNote?.id).toBeDefined();
    });

    it("tracks creating state", async () => {
      const { result } = renderHook(() => useNotes({ contactId: "contact-1" }), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isCreating).toBe(false);

      result.current.createNote({ content: "Another note" });

      await waitFor(() => expect(result.current.isCreating).toBe(false));
      
      // Note should be created
      expect(result.current.notes.some(n => n.contentPlain === "Another note")).toBe(true);
    });
  });

  describe("Update Note", () => {
    it("updates a note successfully", async () => {
      const { result } = renderHook(() => useNotes({ contactId: "contact-1" }), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const noteId = result.current.notes[0].id;

      result.current.updateNote({
        noteId,
        content: "Updated content",
      });

      // Optimistic update should update immediately
      await waitFor(() => {
        const updatedNote = result.current.notes.find((n) => n.id === noteId);
        return updatedNote?.contentPlain === "Updated content";
      });

      expect(result.current.isUpdating).toBe(false);
    });

    it("tracks updating state", async () => {
      const { result } = renderHook(() => useNotes({ contactId: "contact-1" }), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isUpdating).toBe(false);

      result.current.updateNote({
        noteId: "note-1",
        content: "Modified",
      });

      await waitFor(() => expect(result.current.isUpdating).toBe(false));
      
      // Note should be updated
      const updatedNote = result.current.notes.find(n => n.id === "note-1");
      expect(updatedNote?.contentPlain).toBe("Modified");
    });
  });

  describe("Delete Note", () => {
    it("deletes a note successfully", async () => {
      const { result } = renderHook(() => useNotes({ contactId: "contact-1" }), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const initialLength = result.current.notes.length;
      const noteId = result.current.notes[0].id;

      result.current.deleteNote({ noteId });

      // Optimistic update should remove immediately
      await waitFor(() => expect(result.current.notes).toHaveLength(initialLength - 1));

      const deletedNote = result.current.notes.find((n) => n.id === noteId);
      expect(deletedNote).toBeUndefined();

      await waitFor(() => expect(result.current.isDeleting).toBe(false));
    });

    it("tracks deleting state", async () => {
      const { result } = renderHook(() => useNotes({ contactId: "contact-1" }), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isDeleting).toBe(false);

      result.current.deleteNote({ noteId: "note-1" });

      await waitFor(() => expect(result.current.isDeleting).toBe(false));
      
      // Note should be deleted
      expect(result.current.notes.find(n => n.id === "note-1")).toBeUndefined();
    });

    it("removes correct note from list", async () => {
      const { result } = renderHook(() => useNotes({ contactId: "contact-1" }), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const firstNoteId = result.current.notes[0].id;
      const secondNote = result.current.notes[1];

      result.current.deleteNote({ noteId: firstNoteId });

      await waitFor(() => expect(result.current.notes).toHaveLength(1));

      expect(result.current.notes[0].id).toBe(secondNote.id);
      expect(result.current.notes[0].contentPlain).toBe(secondNote.contentPlain);
    });
  });

  describe("Multiple Operations", () => {
    it("can perform create, update, and delete in sequence", async () => {
      const { result } = renderHook(() => useNotes({ contactId: "contact-1" }), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Create
      result.current.createNote({ content: "Sequential test note" });
      await waitFor(() => expect(result.current.isCreating).toBe(false));

      const createdNote = result.current.notes.find((n) => n.contentPlain === "Sequential test note");
      expect(createdNote).toBeDefined();

      // Update
      if (createdNote) {
        result.current.updateNote({
          noteId: createdNote.id,
          content: "Modified sequential note",
        });
        await waitFor(() => expect(result.current.isUpdating).toBe(false));

        const updatedNote = result.current.notes.find((n) => n.id === createdNote.id);
        expect(updatedNote?.contentPlain).toBe("Modified sequential note");

        // Delete
        result.current.deleteNote({ noteId: createdNote.id });
        await waitFor(() => expect(result.current.isDeleting).toBe(false));

        const deletedNote = result.current.notes.find((n) => n.id === createdNote.id);
        expect(deletedNote).toBeUndefined();
      }
    });
  });
});

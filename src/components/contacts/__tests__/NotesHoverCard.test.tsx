import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotesHoverCard } from '../NotesHoverCard';
import type { Note } from '@/server/db/schema';

// Mock dependencies
vi.mock('@/hooks/use-notes', () => ({
  useNotes: vi.fn(),
}));

const { useNotes } = await import('@/hooks/use-notes');

// Mock data
const mockNotes: Note[] = [
  {
    id: 'note-1',
    contactId: 'contact-1',
    userId: 'user-1',
    content: 'Client showed great improvement in flexibility today.',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  },
  {
    id: 'note-2',
    contactId: 'contact-1',
    userId: 'user-1',
    content: 'Mentioned interest in advanced yoga classes.',
    createdAt: new Date('2024-01-14T15:30:00Z'),
    updatedAt: new Date('2024-01-14T16:00:00Z'),
  },
];

describe('NotesHoverCard', () => {
  let queryClient: QueryClient;
  const mockCreateNote = vi.fn();
  const mockUpdateNote = vi.fn();
  const mockDeleteNote = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(useNotes).mockReturnValue({
      notes: mockNotes,
      isLoading: false,
      error: null,
      createNote: mockCreateNote,
      updateNote: mockUpdateNote,
      deleteNote: mockDeleteNote,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    });

    mockCreateNote.mockClear();
    mockUpdateNote.mockClear();
    mockDeleteNote.mockClear();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('CRITICAL: Basic Rendering', () => {
    it('renders trigger with notes count and last note preview', () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={2}
          lastNote="Client showed great improvement"
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      expect(trigger).toBeInTheDocument();
      
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Client showed great improvement')).toBeInTheDocument();
    });

    it('renders trigger without last note preview when none provided', () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={0}
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      expect(trigger).toBeInTheDocument();
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('CRITICAL: Hover Card Content', () => {
    it('shows hover content when triggered', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={2}
          lastNote="Client showed great improvement"
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('notes-hover-content-contact-1')).toBeInTheDocument();
        expect(screen.getByText('Notes for John Doe')).toBeInTheDocument();
        expect(screen.getByText('2 notes')).toBeInTheDocument();
      });
    });

    it('displays existing notes in the hover content', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={2}
          lastNote="Client showed great improvement"
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('note-item-note-1')).toBeInTheDocument();
        expect(screen.getByTestId('note-item-note-2')).toBeInTheDocument();
        expect(screen.getByText('Client showed great improvement in flexibility today.')).toBeInTheDocument();
        expect(screen.getByText('Mentioned interest in advanced yoga classes.')).toBeInTheDocument();
      });
    });
  });

  describe('HIGH: Note Creation', () => {
    it('shows add note form when add button clicked', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={0}
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const addButton = screen.getByTestId('add-note-button');
        fireEvent.click(addButton);
        
        expect(screen.getByTestId('add-note-textarea')).toBeInTheDocument();
      });
    });

    it('creates new note when form submitted', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={0}
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(async () => {
        const addButton = screen.getByTestId('add-note-button');
        fireEvent.click(addButton);
        
        const textarea = screen.getByTestId('add-note-textarea');
        fireEvent.change(textarea, { target: { value: 'New note content' } });
        
        const saveButton = screen.getByTestId('save-add-note');
        fireEvent.click(saveButton);
        
        expect(mockCreateNote).toHaveBeenCalledWith({ content: 'New note content' });
      });
    });

    it('validates note content before creation', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={0}
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const addButton = screen.getByTestId('add-note-button');
        fireEvent.click(addButton);
        
        const saveButton = screen.getByTestId('save-add-note');
        expect(saveButton).toBeDisabled(); // Should be disabled when empty
      });
    });

    it('handles keyboard shortcuts for note creation', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={0}
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const addButton = screen.getByTestId('add-note-button');
        fireEvent.click(addButton);
        
        const textarea = screen.getByTestId('add-note-textarea');
        fireEvent.change(textarea, { target: { value: 'Keyboard shortcut test' } });
        
        // Cmd+Enter should save
        fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
        
        expect(mockCreateNote).toHaveBeenCalledWith({ content: 'Keyboard shortcut test' });
      });
    });
  });

  describe('HIGH: Note Editing', () => {
    it('enters edit mode when edit button clicked', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={2}
          lastNote="Client showed great improvement"
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const editButton = screen.getByTestId('edit-note-note-1');
        fireEvent.click(editButton);
        
        expect(screen.getByTestId('edit-note-textarea-note-1')).toBeInTheDocument();
      });
    });

    it('saves edited note content', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={2}
          lastNote="Client showed great improvement"
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(async () => {
        const editButton = screen.getByTestId('edit-note-note-1');
        fireEvent.click(editButton);
        
        const textarea = screen.getByTestId('edit-note-textarea-note-1');
        fireEvent.change(textarea, { target: { value: 'Updated note content' } });
        
        const saveButton = screen.getByTestId('save-edit-note-1');
        fireEvent.click(saveButton);
        
        expect(mockUpdateNote).toHaveBeenCalledWith({ 
          noteId: 'note-1', 
          content: 'Updated note content' 
        });
      });
    });

    it('cancels edit mode without saving changes', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={2}
          lastNote="Client showed great improvement"
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const editButton = screen.getByTestId('edit-note-note-1');
        fireEvent.click(editButton);
        
        const textarea = screen.getByTestId('edit-note-textarea-note-1');
        fireEvent.change(textarea, { target: { value: 'Changed content' } });
        
        const cancelButton = screen.getByTestId('cancel-edit-note-1');
        fireEvent.click(cancelButton);
        
        expect(mockUpdateNote).not.toHaveBeenCalled();
        expect(screen.queryByTestId('edit-note-textarea-note-1')).not.toBeInTheDocument();
      });
    });
  });

  describe('HIGH: Note Deletion', () => {
    it('opens delete confirmation dialog', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={2}
          lastNote="Client showed great improvement"
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-note-note-1');
        fireEvent.click(deleteButton);
        
        expect(screen.getByText('Delete Note')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete this note/)).toBeInTheDocument();
      });
    });

    it('deletes note when confirmed', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={2}
          lastNote="Client showed great improvement"
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(async () => {
        const deleteButton = screen.getByTestId('delete-note-note-1');
        fireEvent.click(deleteButton);
        
        const confirmButton = screen.getByTestId('confirm-delete-note-1');
        fireEvent.click(confirmButton);
        
        expect(mockDeleteNote).toHaveBeenCalledWith({ noteId: 'note-1' });
      });
    });

    it('cancels deletion when cancel clicked', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={2}
          lastNote="Client showed great improvement"
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-note-note-1');
        fireEvent.click(deleteButton);
        
        const cancelButton = screen.getByTestId('cancel-delete-note-1');
        fireEvent.click(cancelButton);
        
        expect(mockDeleteNote).not.toHaveBeenCalled();
      });
    });
  });

  describe('MODERATE: Loading and Error States', () => {
    it('shows loading state when fetching notes', async () => {
      vi.mocked(useNotes).mockReturnValue({
        notes: [],
        isLoading: true,
        error: null,
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
      });

      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={0}
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        // Should show skeleton loaders
        expect(screen.getByTestId('notes-hover-content-contact-1')).toBeInTheDocument();
      });
    });

    it('shows error state when notes fail to load', async () => {
      vi.mocked(useNotes).mockReturnValue({
        notes: [],
        isLoading: false,
        error: new Error('Failed to load notes'),
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
      });

      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={0}
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('Failed to load notes')).toBeInTheDocument();
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it('shows empty state when no notes exist', async () => {
      vi.mocked(useNotes).mockReturnValue({
        notes: [],
        isLoading: false,
        error: null,
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
      });

      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={0}
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('No notes yet')).toBeInTheDocument();
        expect(screen.getByText('Add your first note above')).toBeInTheDocument();
      });
    });
  });

  describe('LOW: Edge Cases and Accessibility', () => {
    it('handles very long note content gracefully', async () => {
      const longNote = {
        ...mockNotes[0],
        content: 'This is a very long note content that should be handled gracefully without breaking the UI layout or causing any rendering issues'.repeat(10),
      };

      vi.mocked(useNotes).mockReturnValue({
        notes: [longNote],
        isLoading: false,
        error: null,
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
      });

      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={1}
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('note-item-note-1')).toBeInTheDocument();
      });
    });

    it('maintains focus management during edit operations', async () => {
      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={2}
          lastNote="Client showed great improvement"
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        const editButton = screen.getByTestId('edit-note-note-1');
        fireEvent.click(editButton);
        
        const textarea = screen.getByTestId('edit-note-textarea-note-1');
        expect(document.activeElement).toBe(textarea);
      });
    });

    it('shows edited indicator for modified notes', async () => {
      const editedNote = {
        ...mockNotes[0],
        updatedAt: new Date('2024-01-15T12:00:00Z'), // Different from createdAt
      };

      vi.mocked(useNotes).mockReturnValue({
        notes: [editedNote],
        isLoading: false,
        error: null,
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
      });

      renderWithQueryClient(
        <NotesHoverCard
          contactId="contact-1"
          contactName="John Doe"
          notesCount={1}
        />
      );

      const trigger = screen.getByTestId('notes-hover-trigger-contact-1');
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByText('(edited)')).toBeInTheDocument();
      });
    });
  });
});
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AllNotesView } from "../AllNotesView";
import { useNotesInfinite } from "@/hooks/use-notes-infinite";
import { useRouter } from "next/navigation";
import type { Note } from "@/server/db/schema";

// Mock the hooks
vi.mock("@/hooks/use-notes-infinite");
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock the UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className} data-testid="card-content">
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={className} data-testid="card-header">
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 className={className} data-testid="card-title">
      {children}
    </h3>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`} data-testid="badge">
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, ref, className }: any) => (
    <div className={className} data-testid="scroll-area" ref={ref}>
      {children}
    </div>
  ),
}));

// Mock the NotesDateIndex component
vi.mock("../NotesDateIndex", () => ({
  NotesDateIndex: ({ notes, onDateClick, className }: any) => (
    <div className={className} data-testid="notes-date-index">
      <div>Date Index</div>
      {notes.map((note: Note, index: number) => (
        <button
          key={index}
          onClick={() => onDateClick(new Date(note.createdAt))}
          data-testid={`date-button-${index}`}
        >
          {new Date(note.createdAt).toLocaleDateString()}
        </button>
      ))}
    </div>
  ),
}));

// Mock the NoteEditor component
vi.mock(
  "@/app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/NoteEditor",
  () => ({
    NoteEditor: ({ content, className, ...props }: any) => (
      <div className={className} data-testid="note-editor">
        {content}
      </div>
    ),
  }),
);

// Mock react-intersection-observer
vi.mock("react-intersection-observer", () => ({
  useInView: () => ({
    ref: vi.fn(),
  }),
}));

describe("AllNotesView", () => {
  const mockNotes: Note[] = [
    {
      id: "note-1",
      userId: "user-1",
      contactId: "contact-1",
      contentPlain: "Test note 1",
      contentRich: {},
      piiEntities: [],
      sourceType: "typed",
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: "note-2",
      userId: "user-1",
      contactId: "contact-1",
      contentPlain: "Test note 2",
      contentRich: {},
      piiEntities: [],
      sourceType: "typed",
      createdAt: new Date("2024-01-20"),
      updatedAt: new Date("2024-01-20"),
    },
  ];

  const mockOnAddNote = vi.fn();
  const mockOnEditNote = vi.fn();
  const mockOnDeleteNote = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  it("should render loading state", () => {
    vi.mocked(useNotesInfinite).mockReturnValue({
      data: undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: true,
      error: null,
    } as any);

    render(
      <AllNotesView
        contactId="contact-1"
        onAddNote={mockOnAddNote}
        onEditNote={mockOnEditNote}
        onDeleteNote={mockOnDeleteNote}
      />,
    );

    expect(screen.getByText("Loading notes...")).toBeInTheDocument();
  });

  it("should render error state", () => {
    vi.mocked(useNotesInfinite).mockReturnValue({
      data: undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: new Error("Failed to load notes"),
    } as any);

    render(
      <AllNotesView
        contactId="contact-1"
        onAddNote={mockOnAddNote}
        onEditNote={mockOnEditNote}
        onDeleteNote={mockOnDeleteNote}
      />,
    );

    expect(screen.getByText("Error loading notes. Please try again.")).toBeInTheDocument();
  });

  it("should render notes when data is available", () => {
    vi.mocked(useNotesInfinite).mockReturnValue({
      data: {
        pages: [
          {
            notes: mockNotes,
            pagination: {
              page: 1,
              pageSize: 10,
              total: 2,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        ],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    } as any);

    render(
      <AllNotesView
        contactId="contact-1"
        onAddNote={mockOnAddNote}
        onEditNote={mockOnEditNote}
        onDeleteNote={mockOnDeleteNote}
      />,
    );

    expect(screen.getByText("All Notes")).toBeInTheDocument();
    expect(screen.getByText("Test note 1")).toBeInTheDocument();
    expect(screen.getByText("Test note 2")).toBeInTheDocument();
  });

  it("should render empty state when no notes", () => {
    vi.mocked(useNotesInfinite).mockReturnValue({
      data: {
        pages: [
          {
            notes: [],
            pagination: {
              page: 1,
              pageSize: 10,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          },
        ],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    } as any);

    render(
      <AllNotesView
        contactId="contact-1"
        onAddNote={mockOnAddNote}
        onEditNote={mockOnEditNote}
        onDeleteNote={mockOnDeleteNote}
      />,
    );

    expect(screen.getByText("No notes yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first note to track interactions with this client"),
    ).toBeInTheDocument();
  });

  it("should call onAddNote when Add Note button is clicked", () => {
    vi.mocked(useNotesInfinite).mockReturnValue({
      data: {
        pages: [
          {
            notes: mockNotes,
            pagination: {
              page: 1,
              pageSize: 10,
              total: 2,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        ],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    } as any);

    render(
      <AllNotesView
        contactId="contact-1"
        onAddNote={mockOnAddNote}
        onEditNote={mockOnEditNote}
        onDeleteNote={mockOnDeleteNote}
      />,
    );

    const addButton = screen.getByText("Add Note");
    fireEvent.click(addButton);

    expect(mockOnAddNote).toHaveBeenCalled();
  });

  it("should call onEditNote when edit button is clicked", () => {
    vi.mocked(useNotesInfinite).mockReturnValue({
      data: {
        pages: [
          {
            notes: mockNotes,
            pagination: {
              page: 1,
              pageSize: 10,
              total: 2,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        ],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    } as any);

    render(
      <AllNotesView
        contactId="contact-1"
        onAddNote={mockOnAddNote}
        onEditNote={mockOnEditNote}
        onDeleteNote={mockOnDeleteNote}
      />,
    );

    // Find the edit button by its icon class
    const editButtons = screen.getAllByRole("button");
    const editButton = editButtons.find((button) => button.querySelector(".lucide-square-pen"));

    if (editButton) {
      fireEvent.click(editButton);
      expect(mockOnEditNote).toHaveBeenCalledWith(mockNotes[0]);
    } else {
      // If button not found, the test should fail
      expect(editButton).toBeDefined();
    }
  });

  it("should call onDeleteNote when delete button is clicked", () => {
    vi.mocked(useNotesInfinite).mockReturnValue({
      data: {
        pages: [
          {
            notes: mockNotes,
            pagination: {
              page: 1,
              pageSize: 10,
              total: 2,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        ],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    } as any);

    render(
      <AllNotesView
        contactId="contact-1"
        onAddNote={mockOnAddNote}
        onEditNote={mockOnEditNote}
        onDeleteNote={mockOnDeleteNote}
      />,
    );

    // Find the delete button by its icon class
    const deleteButtons = screen.getAllByRole("button");
    const deleteButton = deleteButtons.find((button) => button.querySelector(".lucide-trash2"));

    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(mockOnDeleteNote).toHaveBeenCalledWith("note-1");
    } else {
      // If button not found, the test should fail
      expect(deleteButton).toBeDefined();
    }
  });

  it("should navigate to note detail when note is clicked", () => {
    vi.mocked(useNotesInfinite).mockReturnValue({
      data: {
        pages: [
          {
            notes: mockNotes,
            pagination: {
              page: 1,
              pageSize: 10,
              total: 2,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        ],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    } as any);

    render(
      <AllNotesView
        contactId="contact-1"
        onAddNote={mockOnAddNote}
        onEditNote={mockOnEditNote}
        onDeleteNote={mockOnDeleteNote}
      />,
    );

    const noteElement = screen.getByText("Test note 1").closest("div");
    if (noteElement) {
      fireEvent.click(noteElement);
    }

    expect(mockPush).toHaveBeenCalledWith("/contacts/contact-1/notes/note-1");
  });

  it("should render tags for notes", () => {
    vi.mocked(useNotesInfinite).mockReturnValue({
      data: {
        pages: [
          {
            notes: mockNotes,
            pagination: {
              page: 1,
              pageSize: 10,
              total: 2,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        ],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    } as any);

    render(
      <AllNotesView
        contactId="contact-1"
        onAddNote={mockOnAddNote}
        onEditNote={mockOnEditNote}
        onDeleteNote={mockOnDeleteNote}
      />,
    );

    expect(screen.getByText("tag1")).toBeInTheDocument();
    expect(screen.getByText("tag2")).toBeInTheDocument();
    expect(screen.getByText("tag3")).toBeInTheDocument();
  });

  it("should show load more button when hasNextPage is true", () => {
    const mockFetchNextPage = vi.fn();
    vi.mocked(useNotesInfinite).mockReturnValue({
      data: {
        pages: [
          {
            notes: mockNotes,
            pagination: {
              page: 1,
              pageSize: 10,
              total: 25,
              totalPages: 3,
              hasNext: true,
              hasPrev: false,
            },
          },
        ],
      },
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
      isLoading: false,
      error: null,
    } as any);

    render(
      <AllNotesView
        contactId="contact-1"
        onAddNote={mockOnAddNote}
        onEditNote={mockOnEditNote}
        onDeleteNote={mockOnDeleteNote}
      />,
    );

    const loadMoreButton = screen.getByText("Load More Notes");
    fireEvent.click(loadMoreButton);

    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it("should show loading state for next page", () => {
    vi.mocked(useNotesInfinite).mockReturnValue({
      data: {
        pages: [
          {
            notes: mockNotes,
            pagination: {
              page: 1,
              pageSize: 10,
              total: 25,
              totalPages: 3,
              hasNext: true,
              hasPrev: false,
            },
          },
        ],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: true,
      isLoading: false,
      error: null,
    } as any);

    render(
      <AllNotesView
        contactId="contact-1"
        onAddNote={mockOnAddNote}
        onEditNote={mockOnEditNote}
        onDeleteNote={mockOnDeleteNote}
      />,
    );

    expect(screen.getByText("Loading more notes...")).toBeInTheDocument();
  });
});

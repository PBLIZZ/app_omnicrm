// React testing utilities;
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotesHoverCard } from "../NotesHoverCard";
import { renderWithProviders, mockApiResponses } from "../../../../../__tests__/test-utils";
import {
  setupRepoMocks,
  resetRepoMocks,
  makeNoteDTO,
  testUtils,
  type AllRepoFakes,
} from "@packages/testing";

// Mock the API client
vi.mock("@/lib/api/client", () => ({
  get: vi.fn(),
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  formatDistanceToNow: vi.fn(() => "2 days ago"),
}));

// Helper function to safely get the trigger element
function getTriggerElement(): HTMLElement {
  const textElement = screen.getByText("Hover trigger");
  const parentElement = textElement.parentElement;
  if (!parentElement) {
    throw new Error("Trigger element's parentElement is null");
  }
  return parentElement;
}

describe("NotesHoverCard", () => {
  let mockGet: ReturnType<typeof vi.fn>;
  let fakes: AllRepoFakes;
  const user = userEvent.setup();

  beforeAll(async () => {
    const apiClientModule = await import("../../../../../lib/api/client");
    mockGet = vi.mocked(apiClientModule.get);
    fakes = setupRepoMocks();
  });

  const defaultProps = {
    clientId: "client-1",
    clientName: "John Doe",
    children: <span>Hover trigger</span>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetRepoMocks(fakes);
  });

  describe("Rendering", () => {
    it("renders the trigger element", () => {
      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      expect(screen.getByText("Hover trigger")).toBeInTheDocument();
    });

    it("applies custom test id to trigger", () => {
      renderWithProviders(<NotesHoverCard {...defaultProps} data-testid="custom-test-id" />);

      expect(screen.getByTestId("custom-test-id")).toBeInTheDocument();
    });

    it("applies hover styles to trigger", () => {
      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = screen.getByText("Hover trigger").parentElement;
      expect(trigger).toHaveClass("cursor-pointer", "hover:bg-muted/20");
    });
  });

  describe("Notes Loading", () => {
    it("fetches notes on mouse enter", async () => {
      mockGet.mockResolvedValueOnce(mockApiResponses.notes.list);

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      expect(mockGet).toHaveBeenCalledWith("/api/contacts/client-1/notes");
    });

    it("displays loading state while fetching", async () => {
      mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      // Hover card should appear
      await waitFor(() => {
        expect(screen.getByText("Notes for John Doe")).toBeInTheDocument();
      });

      // Should show loading skeletons
      const skeletons = screen.getAllByTestId(/skeleton/i);
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("does not fetch notes if clientId is empty", async () => {
      renderWithProviders(<NotesHoverCard {...defaultProps} clientId="" />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("Notes Display", () => {
    it("displays notes when loaded successfully", async () => {
      const mockNotes = [
        makeNoteDTO({
          id: "note-1",
          content: "First note content",
          contactId: "client-1",
          userId: testUtils.defaultUserId,
          createdAt: "2024-01-01T00:00:00Z",
        }),
        makeNoteDTO({
          id: "note-2",
          content: "Second note content",
          contactId: "client-1",
          userId: testUtils.defaultUserId,
          createdAt: "2024-01-02T00:00:00Z",
        }),
      ];

      mockGet.mockResolvedValueOnce({ notes: mockNotes });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText("Notes for John Doe")).toBeInTheDocument();
        expect(screen.getByText("First note content")).toBeInTheDocument();
        expect(screen.getByText("Second note content")).toBeInTheDocument();
      });
    });

    it("marks the first note as latest", async () => {
      const mockNotes = [
        makeNoteDTO({
          id: "note-1",
          content: "Latest note",
          contactId: "client-1",
          userId: testUtils.defaultUserId,
          createdAt: "2024-01-02T00:00:00Z",
        }),
        makeNoteDTO({
          id: "note-2",
          content: "Older note",
          contactId: "client-1",
          userId: testUtils.defaultUserId,
          createdAt: "2024-01-01T00:00:00Z",
        }),
      ];

      mockGet.mockResolvedValueOnce({ notes: mockNotes });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText("(Latest)")).toBeInTheDocument();
      });
    });

    it("displays relative timestamps", async () => {
      const mockNotes = [makeNoteDTO({ contactId: "client-1", userId: testUtils.defaultUserId })];
      mockGet.mockResolvedValueOnce({ notes: mockNotes });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText("2 days ago")).toBeInTheDocument();
      });
    });

    it("displays empty state when no notes exist", async () => {
      mockGet.mockResolvedValueOnce({ notes: [] });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText("No notes yet")).toBeInTheDocument();
      });
    });

    it("limits display to 20 notes", async () => {
      const mockNotes = Array.from({ length: 25 }, (_, i) =>
        makeNoteDTO({
          id: `note-${i}`,
          content: `Note ${i} content`,
          contactId: "client-1",
          userId: testUtils.defaultUserId,
        }),
      );

      mockGet.mockResolvedValueOnce({ notes: mockNotes });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText("Note 0 content")).toBeInTheDocument();
        expect(screen.getByText("Note 19 content")).toBeInTheDocument();
        expect(screen.queryByText("Note 20 content")).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("displays error message when fetch fails", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network error"));

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("displays generic error for non-Error objects", async () => {
      mockGet.mockRejectedValueOnce("String error");

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText("Failed to load notes")).toBeInTheDocument();
      });
    });

    it("clears previous error on new fetch", async () => {
      mockGet.mockRejectedValueOnce(new Error("First error")).mockResolvedValueOnce({
        notes: [makeNoteDTO({ contactId: "client-1", userId: testUtils.defaultUserId })],
      });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();

      // First hover - should show error
      await user.hover(trigger);
      await waitFor(() => {
        expect(screen.getByText("First error")).toBeInTheDocument();
      });

      // Second hover - should clear error and show notes
      await user.unhover(trigger);
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.queryByText("First error")).not.toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("provides proper ARIA labels", async () => {
      mockGet.mockResolvedValueOnce({
        notes: [makeNoteDTO({ contactId: "client-1", userId: testUtils.defaultUserId })],
      });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      await waitFor(() => {
        const header = screen.getByText("Notes for John Doe");
        expect(header).toBeInTheDocument();
        expect(header.tagName).toBe("H4");
      });
    });

    it("triggers data fetch on keyboard focus", async () => {
      mockGet.mockResolvedValueOnce({
        notes: [makeNoteDTO({ contactId: "client-1", userId: testUtils.defaultUserId })],
      });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();

      // Focus the trigger using keyboard navigation
      await user.tab();
      expect(trigger).toHaveFocus();

      // Wait for the API call to be made
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockGet).toHaveBeenCalledWith("/api/contacts/client-1/notes");
      });
    });

    it("provides proper datetime attributes", async () => {
      const mockNotes = [
        makeNoteDTO({
          contactId: "client-1",
          userId: testUtils.defaultUserId,
          createdAt: "2024-01-01T00:00:00Z",
        }),
      ];

      mockGet.mockResolvedValueOnce({ notes: mockNotes });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      await waitFor(() => {
        const timeElement = screen.getByText("2 days ago");
        expect(timeElement.tagName).toBe("TIME");
        expect(timeElement).toHaveAttribute("datetime", "2024-01-01T00:00:00Z");
      });
    });

    it("maintains focus management for keyboard users", async () => {
      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();

      // Should be focusable
      trigger.focus();
      expect(trigger).toHaveFocus();
    });
  });

  describe("Content Formatting", () => {
    it("preserves whitespace in note content", async () => {
      const mockNotes = [
        makeNoteDTO({
          content: "Line one\nLine two\n\nLine four",
          contactId: "client-1",
          userId: testUtils.defaultUserId,
        }),
      ];

      mockGet.mockResolvedValueOnce({ notes: mockNotes });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      await waitFor(() => {
        const contentElement = screen.getByText((content, element) => {
          return element?.textContent === "Line one\nLine two\n\nLine four";
        });
        expect(contentElement).toHaveClass("whitespace-pre-wrap");
      });
    });

    it("applies proper styling classes", async () => {
      mockGet.mockResolvedValueOnce({
        notes: [makeNoteDTO({ contactId: "client-1", userId: testUtils.defaultUserId })],
      });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();
      await user.hover(trigger);

      await waitFor(() => {
        const hoverContent = screen
          .getByText("Notes for John Doe")
          .closest("[data-radix-popper-content-wrapper]");
        expect(hoverContent).toBeInTheDocument();
      });
    });
  });

  describe("State Management", () => {
    it("resets state properly between hovers", async () => {
      mockGet
        .mockResolvedValueOnce({
          notes: [
            makeNoteDTO({
              content: "First fetch",
              contactId: "client-1",
              userId: testUtils.defaultUserId,
            }),
          ],
        })
        .mockResolvedValueOnce({
          notes: [
            makeNoteDTO({
              content: "Second fetch",
              contactId: "client-1",
              userId: testUtils.defaultUserId,
            }),
          ],
        });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();

      // First hover
      await user.hover(trigger);
      await waitFor(() => {
        expect(screen.getByText("First fetch")).toBeInTheDocument();
      });

      // Unhover and hover again
      await user.unhover(trigger);
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText("Second fetch")).toBeInTheDocument();
      });
    });

    it("handles multiple rapid hovers gracefully", async () => {
      mockGet.mockResolvedValue({
        notes: [makeNoteDTO({ contactId: "client-1", userId: testUtils.defaultUserId })],
      });

      renderWithProviders(<NotesHoverCard {...defaultProps} />);

      const trigger = getTriggerElement();

      // Rapid hovers
      await user.hover(trigger);
      await user.unhover(trigger);
      await user.hover(trigger);
      await user.unhover(trigger);
      await user.hover(trigger);

      // Should still work correctly
      await waitFor(() => {
        expect(screen.getByText("Notes for John Doe")).toBeInTheDocument();
      });
    });
  });
});

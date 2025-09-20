// React testing utilities;
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteComposerPopover } from "../NoteComposerPopover";
import { renderWithProviders, mockToast } from "../../../../../__tests__/test-utils";
import { setupRepoMocks, resetRepoMocks, makeNoteDTO, testUtils, type AllRepoFakes } from "@packages/testing";

// Mock the API client - still needed for component API calls
vi.mock("@/lib/api/client", () => ({
  post: vi.fn(),
}));

// Mock Sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe("NoteComposerPopover", () => {
  let mockPost: ReturnType<typeof vi.fn>;
  let fakes: AllRepoFakes;
  const user = userEvent.setup();

  beforeAll(async () => {
    const apiClientModule = await import("../../../../../lib/api/client");
    mockPost = vi.mocked(apiClientModule.post);
    fakes = setupRepoMocks();
  });

  const defaultProps = {
    clientId: "client-1",
    clientName: "John Doe",
    children: <button>Add Note</button>,
  };

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  // Mock speech recognition
  const mockSpeechRecognition = {
    continuous: false,
    interimResults: false,
    lang: "en-US",
    onstart: vi.fn(),
    onresult: vi.fn(),
    onerror: vi.fn(),
    onend: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetRepoMocks(fakes);
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    // Mock SpeechRecognition
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: vi.fn(() => mockSpeechRecognition),
      writable: true,
    });

    // Mock custom event dispatch
    vi.spyOn(window, "dispatchEvent").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("renders the trigger button", () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Add Note" })).toBeInTheDocument();
    });

    it("opens popover when trigger is clicked", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      expect(screen.getByText("Add Note")).toBeInTheDocument();
      expect(screen.getByText("for John Doe")).toBeInTheDocument();
    });

    it("displays correct client name in header", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} clientName="Jane Smith" />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      expect(screen.getByText("for Jane Smith")).toBeInTheDocument();
    });
  });

  describe("Text Input", () => {
    it("renders textarea with placeholder", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute("rows", "5");
    });

    it("allows typing in textarea", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "This is a test note");

      expect(textarea).toHaveValue("This is a test note");
    });

    it("persists draft to localStorage", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "Draft content");

      expect(localStorageMock.setItem).toHaveBeenCalledWith("note-draft-client-1", "Draft content");
    });

    it("loads draft from localStorage on open", async () => {
      localStorageMock.getItem.mockReturnValue("Saved draft");

      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      expect(textarea).toHaveValue("Saved draft");
    });
  });

  describe("Note Submission", () => {
    it("submits note successfully", async () => {
      // Use factory for consistent test data
      const mockNote = makeNoteDTO({
        id: "note-1",
        content: "[User] Test note",
        contactId: "client-1",
        userId: testUtils.defaultUserId,
      });
      mockPost.mockResolvedValueOnce(mockNote);

      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "Test note content");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      expect(mockPost).toHaveBeenCalledWith("/api/omni-clients/client-1/notes", {
        content: "[User] Test note content",
      });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Note saved successfully");
      });
    });

    it("submits note with Enter key", async () => {
      const mockNote = makeNoteDTO({
        id: "note-1",
        content: "[User] Test note",
        contactId: "client-1",
        userId: testUtils.defaultUserId,
      });
      mockPost.mockResolvedValueOnce(mockNote);

      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "Test note content");
      await user.keyboard("{Enter}");

      expect(mockPost).toHaveBeenCalledWith("/api/omni-clients/client-1/notes", {
        content: "[User] Test note content",
      });
    });

    it("prevents submission with Shift+Enter", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "Test note content");
      await user.keyboard("{Shift>}{Enter}{/Shift}");

      expect(mockPost).not.toHaveBeenCalled();
    });

    it("prevents submission of empty notes", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      expect(mockPost).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith("Please enter a note");
    });

    it("prevents submission of whitespace-only notes", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "   \n   ");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      expect(mockPost).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith("Please enter a note");
    });

    it("clears form and closes popover after successful submission", async () => {
      const mockNote = makeNoteDTO({
        id: "note-1",
        content: "[User] Test note",
        contactId: "client-1",
        userId: testUtils.defaultUserId,
      });
      mockPost.mockResolvedValueOnce(mockNote);

      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "Test note content");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("note-draft-client-1");
      });

      // Popover should close (content should not be visible)
      await waitFor(() => {
        expect(screen.queryByText("for John Doe")).not.toBeInTheDocument();
      });
    });

    it("dispatches notesUpdated event after successful submission", async () => {
      const mockNote = makeNoteDTO({
        id: "note-1",
        content: "[User] Test note",
        contactId: "client-1",
        userId: testUtils.defaultUserId,
      });
      mockPost.mockResolvedValueOnce(mockNote);

      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "Test note content");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      await waitFor(() => {
        expect(window.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "notesUpdated",
            detail: { clientId: "client-1" },
          }),
        );
      });
    });

    it("handles submission errors gracefully", async () => {
      mockPost.mockRejectedValueOnce(new Error("Network error"));

      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "Test note content");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to save note");
      });

      // Form should remain open with content preserved
      expect(textarea).toHaveValue("Test note content");
    });
  });

  describe("AI Enhancement", () => {
    it("enhances note content with AI", async () => {
      mockPost.mockResolvedValueOnce({
        enhancedContent: "Enhanced: Test note content with AI improvements",
      });

      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "Test note content");

      const enhanceButton = screen.getByRole("button", { name: "Enhance" });
      await user.click(enhanceButton);

      expect(mockPost).toHaveBeenCalledWith("/api/omni-clients/client-1/notes/enhance", {
        content: "Test note content",
      });

      await waitFor(() => {
        expect(textarea).toHaveValue("Enhanced: Test note content with AI improvements");
        expect(mockToast.success).toHaveBeenCalledWith("Note enhanced with AI");
      });
    });

    it("disables enhance button when content is empty", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const enhanceButton = screen.getByRole("button", { name: "Enhance" });
      expect(enhanceButton).toBeDisabled();
    });

    it("shows enhancing state", async () => {
      mockPost.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "Test note content");

      const enhanceButton = screen.getByRole("button", { name: "Enhance" });
      await user.click(enhanceButton);

      expect(screen.getByRole("button", { name: "Enhancing..." })).toBeInTheDocument();
    });

    it("handles enhancement errors", async () => {
      mockPost.mockRejectedValueOnce(new Error("AI service unavailable"));

      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "Test note content");

      const enhanceButton = screen.getByRole("button", { name: "Enhance" });
      await user.click(enhanceButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("AI enhancement not available");
      });
    });

    it("prevents enhancement of empty content", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const enhanceButton = screen.getByRole("button", { name: "Enhance" });
      await user.click(enhanceButton);

      expect(mockPost).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith("Please enter some text to enhance");
    });
  });

  describe("Voice Recognition", () => {
    it("starts voice recognition when supported", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const voiceButton = screen.getByRole("button", { name: "Voice" });
      await user.click(voiceButton);

      expect(mockSpeechRecognition.start).toHaveBeenCalled();
      expect(mockToast.info).toHaveBeenCalledWith("Listening... Speak now");
    });

    it("shows error when speech recognition is not supported", async () => {
      // Remove speech recognition support
      Object.defineProperty(window, "webkitSpeechRecognition", {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(window, "SpeechRecognition", {
        value: undefined,
        writable: true,
      });

      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const voiceButton = screen.getByRole("button", { name: "Voice" });
      await user.click(voiceButton);

      expect(mockToast.error).toHaveBeenCalledWith(
        "Voice recognition not supported in this browser",
      );
    });

    it("shows listening state during voice recognition", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const voiceButton = screen.getByRole("button", { name: "Voice" });
      await user.click(voiceButton);

      // Simulate onstart callback
      mockSpeechRecognition.onstart();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Listening..." })).toBeInTheDocument();
      });
    });

    it("adds voice transcript to content", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "Existing content");

      const voiceButton = screen.getByRole("button", { name: "Voice" });
      await user.click(voiceButton);

      // Simulate speech recognition result
      const mockEvent = {
        results: [[{ transcript: "voice input", confidence: 0.9 }]],
      };

      mockSpeechRecognition.onresult(mockEvent as any);

      await waitFor(() => {
        expect(textarea).toHaveValue("Existing content voice input");
        expect(mockToast.success).toHaveBeenCalledWith("Voice input added");
      });
    });

    it("handles voice recognition errors", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const voiceButton = screen.getByRole("button", { name: "Voice" });
      await user.click(voiceButton);

      // Simulate error
      mockSpeechRecognition.onerror(new Event("error"));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Voice recognition failed");
      });
    });
  });

  describe("Button States", () => {
    it("disables save button when submitting", async () => {
      mockPost.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      await user.type(textarea, "Test note content");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    });

    it("disables save button when content is empty", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton).toBeDisabled();
    });

    it("enables save button when content is provided", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      const saveButton = screen.getByRole("button", { name: "Save" });

      expect(saveButton).toBeDisabled();

      await user.type(textarea, "Test content");

      expect(saveButton).toBeEnabled();
    });
  });

  describe("Accessibility", () => {
    it("provides proper form labels", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      expect(screen.getByText("Add Note")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Write your note here...")).toBeInTheDocument();
    });

    it("supports keyboard navigation", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      const enhanceButton = screen.getByRole("button", { name: "Enhance" });
      const voiceButton = screen.getByRole("button", { name: "Voice" });
      const saveButton = screen.getByRole("button", { name: "Save" });

      // Tab through focusable elements
      await user.tab();
      expect(textarea).toHaveFocus();

      await user.tab();
      expect(enhanceButton).toHaveFocus();

      await user.tab();
      expect(voiceButton).toHaveFocus();

      await user.tab();
      expect(saveButton).toHaveFocus();
    });

    it("provides proper ARIA attributes", async () => {
      renderWithProviders(<NoteComposerPopover {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Add Note" }));

      const textarea = screen.getByPlaceholderText("Write your note here...");
      expect(textarea).toHaveAttribute("rows", "5");

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        if (button.textContent?.includes("disabled")) {
          expect(button).toBeDisabled();
        }
      });
    });
  });
});

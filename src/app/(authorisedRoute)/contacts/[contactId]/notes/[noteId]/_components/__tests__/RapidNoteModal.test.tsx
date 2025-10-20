import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, afterEach } from "vitest";
import { RapidNoteModal } from "../RapidNoteModal";

// Mock the VoiceRecorder component
vi.mock("../VoiceRecorder", () => ({
  VoiceRecorder: ({ onRecordingComplete }: { onRecordingComplete: (audioBlob: Blob) => void }) => (
    <div data-testid="voice-recorder">
      <button
        onClick={() => onRecordingComplete(new Blob(["test audio"], { type: "audio/wav" }))}
        data-testid="mock-record-button"
      >
        Mock Record
      </button>
    </div>
  ),
}));

// Mock the ContactSearchCombobox component
vi.mock("../ContactSearchCombobox", () => ({
  ContactSearchCombobox: ({ value, onValueChange, placeholder }: any) => (
    <div data-testid="contact-search-combobox">
      <input
        data-testid="contact-search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </div>
  ),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("RapidNoteModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    lastViewedContactId: "1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Rendering", () => {
    it("renders modal when open", () => {
      render(<RapidNoteModal {...defaultProps} />);
      expect(screen.getByText("Rapid Note Capture")).toBeInTheDocument();
    });

    it("does not render modal when closed", () => {
      render(<RapidNoteModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Rapid Note Capture")).not.toBeInTheDocument();
    });

    it("renders contact search combobox", () => {
      render(<RapidNoteModal {...defaultProps} />);
      expect(screen.getByTestId("contact-search-combobox")).toBeInTheDocument();
    });

    it("renders textarea for note content", () => {
      render(<RapidNoteModal {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("Type your note here or click the microphone to record..."),
      ).toBeInTheDocument();
    });

    it("renders character counter", () => {
      render(<RapidNoteModal {...defaultProps} />);
      expect(screen.getByText("0/1200")).toBeInTheDocument();
    });

    it("renders voice recorder", () => {
      render(<RapidNoteModal {...defaultProps} />);
      expect(screen.getByTestId("voice-recorder")).toBeInTheDocument();
    });

    it("renders save and cancel buttons", () => {
      render(<RapidNoteModal {...defaultProps} />);
      expect(screen.getByText("Save Note")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<RapidNoteModal {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<RapidNoteModal {...defaultProps} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("updates character counter when typing", async () => {
      const user = userEvent.setup();
      render(<RapidNoteModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Type your note here or click the microphone to record...",
      );
      await user.type(textarea, "Hello world");

      expect(screen.getByText("11/1200")).toBeInTheDocument();
    });

    it("prevents saving when no contact is selected", async () => {
      const user = userEvent.setup();
      render(<RapidNoteModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Type your note here or click the microphone to record...",
      );
      await user.type(textarea, "Test note");

      const saveButton = screen.getByText("Save Note");
      await user.click(saveButton);

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("prevents saving when no content is entered", async () => {
      const user = userEvent.setup();
      render(<RapidNoteModal {...defaultProps} />);

      const contactInput = screen.getByTestId("contact-search-input");
      await user.type(contactInput, "1");

      const saveButton = screen.getByText("Save Note");
      await user.click(saveButton);

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("calls onSave with correct data when both contact and content are provided", async () => {
      const user = userEvent.setup();
      render(<RapidNoteModal {...defaultProps} />);

      const contactInput = screen.getByTestId("contact-search-input");
      await user.type(contactInput, "1");

      const textarea = screen.getByPlaceholderText(
        "Type your note here or click the microphone to record...",
      );
      await user.type(textarea, "Test note content");

      const saveButton = screen.getByText("Save Note");
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        contactId: "1",
        content: "Test note content",
        sourceType: "typed",
      });
    });
  });

  describe("Voice Recording", () => {
    it("handles voice recording completion", async () => {
      const user = userEvent.setup();
      render(<RapidNoteModal {...defaultProps} />);

      const recordButton = screen.getByTestId("mock-record-button");
      await user.click(recordButton);

      // Voice recording should update the content
      const textarea = screen.getByPlaceholderText(
        "Type your note here or click the microphone to record...",
      );
      expect(textarea).toHaveValue("[Voice recording completed]");
    });
  });

  describe("Auto-save draft functionality", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("saves draft to localStorage every 5 seconds while typing", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<RapidNoteModal {...defaultProps} />);

      const contactInput = screen.getByTestId("contact-search-input");
      await user.type(contactInput, "1");

      const textarea = screen.getByPlaceholderText(
        "Type your note here or click the microphone to record...",
      );
      await user.type(textarea, "Test draft content");

      // Advance timers to trigger auto-save
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "rapid-note-draft-1",
          "Test draft content",
        );
      });
    }, 10000);

    it("restores draft on modal reopen with unsaved content", () => {
      localStorageMock.getItem.mockReturnValue("Saved draft content");

      render(<RapidNoteModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Type your note here or click the microphone to record...",
      );
      expect(textarea).toHaveValue("Saved draft content");
    });

    it("clears draft after successful save", async () => {
      const user = userEvent.setup();
      render(<RapidNoteModal {...defaultProps} />);

      const contactInput = screen.getByTestId("contact-search-input");
      await user.type(contactInput, "1");

      const textarea = screen.getByPlaceholderText(
        "Type your note here or click the microphone to record...",
      );
      await user.type(textarea, "Test note content");

      const saveButton = screen.getByText("Save Note");
      await user.click(saveButton);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("rapid-note-draft-1");
    });

    it("shows restore draft prompt when draft exists", () => {
      localStorageMock.getItem.mockReturnValue("Saved draft content");

      render(<RapidNoteModal {...defaultProps} />);

      expect(screen.getByText("Restore draft?")).toBeInTheDocument();
    });
  });

  describe("Character limit", () => {
    it("enforces 1200 character limit", async () => {
      const user = userEvent.setup();
      render(<RapidNoteModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Type your note here or click the microphone to record...",
      );
      const longText = "a".repeat(1201);

      await user.type(textarea, longText);

      expect(textarea).toHaveValue("a".repeat(1200));
      expect(screen.getByText("1200/1200")).toBeInTheDocument();
    });
  });
});

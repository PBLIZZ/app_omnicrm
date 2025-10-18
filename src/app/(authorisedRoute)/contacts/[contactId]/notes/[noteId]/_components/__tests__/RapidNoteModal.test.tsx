/**
 * RapidNoteModal Component Unit Tests
 * Test-Driven Development (TDD) - Task 1.2.1 - 1.2.17
 *
 * Tests for RapidNoteModal component functionality:
 * - Full-screen modal rendering with dimmed background
 * - Background interaction blocking
 * - Input bar with text area and mic icon
 * - Contact selector dropdown
 * - Inline editing with cursor positioning
 * - 1200 character limit with visual indicator
 * - Save button with loading state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RapidNoteModal } from "../RapidNoteModal";

// Mock VoiceRecorder component
vi.mock("../VoiceRecorder", () => ({
  VoiceRecorder: ({ onRecordingComplete }: { onRecordingComplete: (blob: Blob) => void }) => (
    <div data-testid="mock-voice-recorder">
      <button
        onClick={() => {
          const mockBlob = new Blob(["mock audio"], { type: "audio/webm" });
          onRecordingComplete(mockBlob);
        }}
      >
        Mock Record
      </button>
    </div>
  ),
}));

// Mock contacts data
const mockContacts = [
  { id: "1", displayName: "John Doe", primaryEmail: "john@example.com" },
  { id: "2", displayName: "Jane Smith", primaryEmail: "jane@example.com" },
  { id: "3", displayName: "Bob Johnson", primaryEmail: "bob@example.com" },
];

describe("RapidNoteModal Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Task 1.2.1: Test that modal renders full-screen with dimmed background
   * Expected behavior:
   * - Modal takes full viewport
   * - Background is dimmed/overlaid
   * - Modal content is centered
   */
  it("should render full-screen with dimmed background", () => {
    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    // Check for dialog overlay (dimmed background)
    const overlay = screen.getByRole("dialog").parentElement;
    expect(overlay).toHaveClass(/overlay|backdrop/i);

    // Check modal is visible and full-screen
    const modal = screen.getByRole("dialog");
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute("aria-modal", "true");
  });

  it("should not render when isOpen is false", () => {
    render(
      <RapidNoteModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  /**
   * Task 1.2.3: Test that modal blocks background interactions
   * Expected behavior:
   * - Background content is not clickable
   * - Escape key closes modal
   * - Click outside closes modal (if configured)
   */
  it("should block background interactions when open", () => {
    const backgroundElement = document.createElement("button");
    backgroundElement.textContent = "Background Button";
    backgroundElement.onclick = vi.fn();
    document.body.appendChild(backgroundElement);

    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    // Try to click background element
    fireEvent.click(backgroundElement);

    // Background onclick should not be called (covered by overlay)
    expect(backgroundElement.onclick).not.toHaveBeenCalled();

    document.body.removeChild(backgroundElement);
  });

  it("should close modal on Escape key", async () => {
    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    const modal = screen.getByRole("dialog");
    fireEvent.keyDown(modal, { key: "Escape", code: "Escape" });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  /**
   * Task 1.2.5: Test input bar with text area and mic icon
   * Expected behavior:
   * - Text area is visible and editable
   * - Mic icon button is present
   * - Enter key adds new line (not submits)
   */
  it("should render input bar with text area and mic icon", () => {
    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    // Text area should be present
    const textArea = screen.getByRole("textbox", { name: /note content|rapid note/i });
    expect(textArea).toBeInTheDocument();
    expect(textArea).toHaveAttribute("placeholder");

    // Mic icon button should be present
    const micButton = screen.getByRole("button", { name: /record|microphone|voice/i });
    expect(micButton).toBeInTheDocument();
  });

  it("should allow text input in text area", async () => {
    const user = userEvent.setup();

    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    const textArea = screen.getByRole("textbox", { name: /note content|rapid note/i });

    await user.type(textArea, "This is a test note");

    expect(textArea).toHaveValue("This is a test note");
  });

  it("should allow Enter key to add new line", async () => {
    const user = userEvent.setup();

    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    const textArea = screen.getByRole("textbox", { name: /note content|rapid note/i });

    await user.type(textArea, "Line 1{Enter}Line 2");

    expect(textArea).toHaveValue("Line 1\nLine 2");
  });

  /**
   * Task 1.2.7: Test contact selector dropdown
   * Expected behavior:
   * - Dropdown shows all contacts
   * - Contact can be selected
   * - Selected contact is displayed
   */
  it("should render contact selector dropdown with all contacts", async () => {
    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    // Find contact selector (could be a combobox or button)
    const contactSelector = screen.getByRole("combobox", { name: /contact|select contact/i });
    expect(contactSelector).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(contactSelector);

    // All contacts should be available
    await waitFor(() => {
      mockContacts.forEach((contact) => {
        expect(screen.getByText(contact.displayName)).toBeInTheDocument();
      });
    });
  });

  /**
   * Task 1.2.8: Test last-viewed contact pre-selection
   * Expected behavior:
   * - If lastViewedContactId provided, that contact is pre-selected
   * - Otherwise, dropdown is empty/placeholder
   */
  it("should pre-select last-viewed contact when provided", () => {
    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
        lastViewedContactId="2"
      />,
    );

    const contactSelector = screen.getByRole("combobox", { name: /contact|select contact/i });

    // Jane Smith (id: 2) should be pre-selected
    expect(contactSelector).toHaveTextContent("Jane Smith");
  });

  it("should show placeholder when no contact pre-selected", () => {
    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    const contactSelector = screen.getByRole("combobox", { name: /contact|select contact/i });

    // Should show placeholder
    expect(contactSelector).toHaveTextContent(/select.*contact/i);
  });

  /**
   * Task 1.2.10: Test inline editing with cursor positioning
   * Expected behavior:
   * - User can click anywhere in note to position cursor
   * - User can edit inline (delete, backspace, copy, paste)
   */
  it("should support inline editing with cursor positioning", async () => {
    const user = userEvent.setup();

    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    const textArea = screen.getByRole("textbox", { name: /note content|rapid note/i });

    // Type initial text
    await user.type(textArea, "Hello World");

    // Move cursor to middle (after "Hello ")
    textArea.setSelectionRange(6, 6);

    // Type in the middle
    await user.type(textArea, "Beautiful ");

    expect(textArea).toHaveValue("Hello Beautiful World");
  });

  /**
   * Task 1.2.12: Test 1200 character limit with visual indicator
   * Expected behavior:
   * - Character count displayed
   * - Warning when approaching limit (e.g., > 1100)
   * - Hard limit at 1200 (cannot type more)
   */
  it("should enforce 1200 character limit with visual indicator", async () => {
    const user = userEvent.setup();

    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    const textArea = screen.getByRole("textbox", { name: /note content|rapid note/i });

    // Find character counter
    const characterCounter = screen.getByText(/\d+\s*\/\s*1200/i);
    expect(characterCounter).toBeInTheDocument();
    expect(characterCounter).toHaveTextContent("0 / 1200");

    // Type some text
    await user.type(textArea, "Test note");

    // Counter should update
    expect(characterCounter).toHaveTextContent("9 / 1200");
  });

  it("should show warning when approaching character limit", async () => {
    const user = userEvent.setup();

    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    const textArea = screen.getByRole("textbox", { name: /note content|rapid note/i });

    // Type 1150 characters (should trigger warning)
    const longText = "a".repeat(1150);
    await user.type(textArea, longText);

    const characterCounter = screen.getByText(/1150\s*\/\s*1200/i);

    // Counter should have warning styling
    expect(characterCounter).toHaveClass(/warning|amber|yellow/i);
  });

  it("should prevent typing beyond 1200 characters", async () => {
    const user = userEvent.setup();

    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    const textArea = screen.getByRole("textbox", { name: /note content|rapid note/i });

    // Try to type 1250 characters
    const tooLongText = "a".repeat(1250);
    await user.type(textArea, tooLongText);

    // Should only have 1200 characters
    expect(textArea.value.length).toBe(1200);
  });

  /**
   * Task 1.2.14: Test save button with loading state
   * Expected behavior:
   * - Save button is disabled when no contact selected
   * - Save button shows loading state during save
   * - Save button re-enables after save completes
   */
  it("should show loading state on save button during API call", async () => {
    const user = userEvent.setup();

    // Mock slow save
    const slowSave = vi.fn(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
    );

    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={slowSave}
        contacts={mockContacts}
        lastViewedContactId="1"
      />,
    );

    const textArea = screen.getByRole("textbox", { name: /note content|rapid note/i });
    await user.type(textArea, "Test note for saving");

    const saveButton = screen.getByRole("button", { name: /save/i });

    // Click save
    await user.click(saveButton);

    // Should show loading state
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent(/saving|loading/i);

    // Wait for save to complete
    await waitFor(() => {
      expect(slowSave).toHaveBeenCalled();
    });
  });

  it("should disable save button when no contact selected", () => {
    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    const saveButton = screen.getByRole("button", { name: /save/i });

    // Should be disabled when no contact selected
    expect(saveButton).toBeDisabled();
  });

  it("should enable save button when contact and text provided", async () => {
    const user = userEvent.setup();

    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
        lastViewedContactId="1"
      />,
    );

    const textArea = screen.getByRole("textbox", { name: /note content|rapid note/i });
    await user.type(textArea, "Test note");

    const saveButton = screen.getByRole("button", { name: /save/i });

    // Should be enabled
    expect(saveButton).not.toBeDisabled();
  });

  /**
   * Task 1.2.16: Test helper text display
   * Expected behavior:
   * - Helper text visible below input area
   * - Directs user to Contact Details for advanced editing
   */
  it("should display helper text correctly", () => {
    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    const helperText = screen.getByText(/advanced editing|contact details/i);
    expect(helperText).toBeInTheDocument();
  });

  /**
   * Task 1.2.9: Test mic icon opens VoiceRecorder
   * Expected behavior:
   * - Clicking mic icon shows VoiceRecorder component
   * - Recording can be started
   * - Transcribed text appears in text area
   */
  it("should open VoiceRecorder when mic icon clicked", async () => {
    const user = userEvent.setup();

    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
      />,
    );

    const micButton = screen.getByRole("button", { name: /record|microphone|voice/i });
    await user.click(micButton);

    // VoiceRecorder should be visible
    const voiceRecorder = screen.getByTestId("mock-voice-recorder");
    expect(voiceRecorder).toBeInTheDocument();
  });

  /**
   * Integration test: Complete workflow
   */
  it("should complete full rapid note capture workflow", async () => {
    const user = userEvent.setup();

    render(
      <RapidNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        contacts={mockContacts}
        lastViewedContactId="1"
      />,
    );

    // Select contact
    const contactSelector = screen.getByRole("combobox", { name: /contact|select contact/i });
    expect(contactSelector).toHaveTextContent("John Doe");

    // Type note
    const textArea = screen.getByRole("textbox", { name: /note content|rapid note/i });
    await user.type(textArea, "Client reported improved flexibility after session.");

    // Save
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Should call onSave with correct data
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        contactId: "1",
        content: "Client reported improved flexibility after session.",
        sourceType: "typed",
      });
    });

    // Modal should close after save
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

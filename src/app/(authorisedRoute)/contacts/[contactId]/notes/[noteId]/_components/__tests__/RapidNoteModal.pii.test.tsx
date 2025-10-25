import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RapidNoteModal } from "../RapidNoteModal";

// Mock the PII detector
vi.mock("@/lib/pii-detector-client", () => ({
  validateNoPII: vi.fn((text: string) => {
    if (text.includes("@")) {
      return {
        hasPII: true,
        entities: [
          { type: "email", value: "test@example.com", start: 0, end: 15, redacted: "[EMAIL]" },
        ],
        detectedTypes: ["email"],
      };
    }
    return {
      hasPII: false,
      entities: [],
      detectedTypes: [],
    };
  }),
}));

describe("RapidNoteModal PII Detection (1.6)", () => {
  it("shows amber warning banner when PII is detected (1.6.5)", async () => {
    render(
      <RapidNoteModal
        isOpen={true}
        onClose={() => {}}
        onSave={async () => ({ success: true })}
        lastViewedContactId="c-1"
      />,
    );

    // Type text with PII
    const textarea = screen.getByLabelText(/rapid note content/i);
    fireEvent.change(textarea, { target: { value: "Contact me at test@example.com" } });

    // Should show warning banner
    expect(screen.getByText(/sensitive information detected/i)).toBeInTheDocument();
    expect(screen.getByText(/automatically removed: email/i)).toBeInTheDocument();
  });

  it("hides warning banner when PII is removed (1.6.5)", async () => {
    render(
      <RapidNoteModal
        isOpen={true}
        onClose={() => {}}
        onSave={async () => ({ success: true })}
        lastViewedContactId="c-1"
      />,
    );

    const textarea = screen.getByLabelText(/rapid note content/i);

    // Type text with PII
    fireEvent.change(textarea, { target: { value: "Contact me at test@example.com" } });
    expect(screen.getByText(/sensitive information detected/i)).toBeInTheDocument();

    // Remove PII
    fireEvent.change(textarea, { target: { value: "Contact me for more info" } });
    expect(screen.queryByText(/sensitive information detected/i)).not.toBeInTheDocument();
  });

  it("shows red toast after server-side redaction (1.6.7)", async () => {
    const mockOnSave = vi.fn().mockResolvedValue({ success: true, redactionWarning: true });

    render(
      <RapidNoteModal
        isOpen={true}
        onClose={() => {}}
        onSave={mockOnSave}
        lastViewedContactId="c-1"
      />,
    );

    // Fill form and save
    const textarea = screen.getByLabelText(/rapid note content/i);
    fireEvent.change(textarea, { target: { value: "Some content" } });

    const saveButton = screen.getByRole("button", { name: /save note/i });
    fireEvent.click(saveButton);

    // Should call onSave with the data
    expect(mockOnSave).toHaveBeenCalledWith({
      contactId: "c-1",
      content: "Some content",
      sourceType: "typed",
    });
  });
});

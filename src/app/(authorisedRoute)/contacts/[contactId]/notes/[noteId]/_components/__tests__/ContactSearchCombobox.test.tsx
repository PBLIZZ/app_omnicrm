import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactSearchCombobox } from "../ContactSearchCombobox";

// Mock the useContacts hook
vi.mock("@/hooks/use-contacts", () => ({
  useContacts: vi.fn(() => ({
    data: {
      items: [
        { id: "1", displayName: "John Doe", primaryEmail: "john@example.com" },
        { id: "2", displayName: "Jane Smith", primaryEmail: "jane@example.com" },
        { id: "3", displayName: "Bob Johnson", primaryEmail: "bob@example.com" },
      ],
    },
    isLoading: false,
  })),
}));

// Mock the UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div data-testid="popover">{children}</div>,
  PopoverTrigger: ({ children }: any) => <div data-testid="popover-trigger">{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: any) => <div data-testid="command">{children}</div>,
  CommandInput: ({ onValueChange, ...props }: any) => (
    <input
      data-testid="command-input"
      onChange={(e) => onValueChange?.(e.target.value)}
      {...props}
    />
  ),
  CommandList: ({ children }: any) => <div data-testid="command-list">{children}</div>,
  CommandEmpty: ({ children }: any) => <div data-testid="command-empty">{children}</div>,
  CommandGroup: ({ children }: any) => <div data-testid="command-group">{children}</div>,
  CommandItem: ({ children, onSelect, ...props }: any) => (
    <div data-testid="command-item" onClick={() => onSelect?.(props.value)} {...props}>
      {children}
    </div>
  ),
}));

describe("ContactSearchCombobox", () => {
  const mockOnValueChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with placeholder text", () => {
    render(
      <ContactSearchCombobox
        value=""
        onValueChange={mockOnValueChange}
        placeholder="Search contacts..."
      />,
    );

    expect(screen.getByText("Search contacts...")).toBeInTheDocument();
  });

  it("shows selected contact when value is provided", () => {
    render(
      <ContactSearchCombobox
        value="1"
        onValueChange={mockOnValueChange}
        placeholder="Search contacts..."
      />,
    );

    // Check that the selected contact is displayed in the trigger button
    expect(screen.getByRole("combobox")).toHaveTextContent("John Doe");
    expect(screen.getByRole("combobox")).toHaveTextContent("john@example.com");
  });

  it("calls onValueChange when contact is selected", async () => {
    const user = userEvent.setup();
    render(
      <ContactSearchCombobox
        value=""
        onValueChange={mockOnValueChange}
        placeholder="Search contacts..."
      />,
    );

    // Click to open the combobox
    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    // Click on a contact item
    const contactItem = screen.getByText("John Doe");
    await user.click(contactItem);

    expect(mockOnValueChange).toHaveBeenCalledWith("1");
  });

  it("handles search input changes", async () => {
    const user = userEvent.setup();
    render(
      <ContactSearchCombobox
        value=""
        onValueChange={mockOnValueChange}
        placeholder="Search contacts..."
      />,
    );

    // Click to open the combobox
    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    // Type in the search input
    const searchInput = screen.getByTestId("command-input");
    await user.type(searchInput, "john");

    expect(searchInput).toHaveValue("john");
  });

  // Note: Loading and empty state tests would require more complex mocking
  // and are better suited for integration tests
});

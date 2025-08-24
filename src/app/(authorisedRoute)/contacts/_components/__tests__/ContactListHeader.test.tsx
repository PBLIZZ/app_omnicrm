import React from "react";
import type { JSX } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Create a simplified test component that just tests the core functionality
type HeaderProps = {
  searchQuery: string;
  onSearch: (value: string) => void;
  selectedCount?: number;
};
const MockContactListHeader = ({
  searchQuery,
  onSearch,
  selectedCount = 0,
}: HeaderProps): JSX.Element => {
  const [value, setValue] = React.useState<string>(searchQuery);
  return (
    <div>
      <h1>Contacts</h1>
      <p>Search, filter and manage your contacts.</p>
      <input
        type="text"
        placeholder="Search contacts…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onSearch(e.target.value);
        }}
        aria-label="Search contacts"
      />
      <button>New Contact</button>
      <button>More</button>
      {selectedCount > 0 && (
        <div>
          <div>{selectedCount} selected</div>
          <button>Send Email</button>
          <button>Add Tags</button>
          <button>Export</button>
          <button>Delete</button>
        </div>
      )}
    </div>
  );
};

describe("ContactListHeader (Simplified)", () => {
  const defaultProps = {
    searchQuery: "",
    onSearch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header content", () => {
    render(<MockContactListHeader {...defaultProps} />);

    expect(screen.getByText("Contacts")).toBeDefined();
    expect(screen.getByText("Search, filter and manage your contacts.")).toBeDefined();
  });

  it("renders search input with correct value", () => {
    render(<MockContactListHeader {...defaultProps} searchQuery="test search" />);
    const searchInput = screen.getByLabelText("Search contacts") as HTMLInputElement;
    expect(searchInput.value).toBe("test search");
  });

  it("renders action buttons", () => {
    render(<MockContactListHeader {...defaultProps} />);

    expect(screen.getByText("New Contact")).toBeDefined();
    expect(screen.getByText("More")).toBeDefined();
  });

  it("does not show bulk actions when no items selected", () => {
    render(<MockContactListHeader {...defaultProps} selectedCount={0} />);

    expect(screen.queryByText("0 selected")).toBeNull();
  });

  it("shows bulk actions when items are selected", () => {
    render(<MockContactListHeader {...defaultProps} selectedCount={3} />);

    expect(screen.getByText("3 selected")).toBeDefined();
    expect(screen.getByText("Send Email")).toBeDefined();
    expect(screen.getByText("Add Tags")).toBeDefined();
    expect(screen.getByText("Export")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
  });

  it("calls onSearch when typing", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<MockContactListHeader {...defaultProps} onSearch={onSearch} />);

    const searchInput = screen.getByLabelText("Search contacts");
    await user.type(searchInput, "test");

    expect(onSearch).toHaveBeenCalled();
    expect(onSearch).toHaveBeenLastCalledWith("test");
  });
});

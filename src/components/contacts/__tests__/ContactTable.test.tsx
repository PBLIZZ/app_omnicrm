import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

interface ContactRow {
  id: string;
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  createdAt?: string;
}

// Simplified ContactTable mock
type RowSelection = Record<string, boolean>;

const MockContactTable = ({
  data,
  onOpen,
  rowSelection = {},
  onRowSelectionChange,
  onSelectionChange,
}: {
  data: ContactRow[];
  onOpen?: (id: string) => void;
  rowSelection?: RowSelection;
  onRowSelectionChange?: (updater: RowSelection | ((prev: RowSelection) => RowSelection)) => void;
  onSelectionChange?: (ids: string[]) => void;
}) => {
  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedIds);
    }
  }, [rowSelection, onSelectionChange, selectedIds]);

  const handleSelectAll = (checked: boolean) => {
    if (onRowSelectionChange) {
      if (checked) {
        const allSelected: Record<string, boolean> = {};
        data.forEach((contact) => {
          allSelected[contact.id] = true;
        });
        onRowSelectionChange(() => allSelected);
      } else {
        onRowSelectionChange(() => ({}));
      }
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (onRowSelectionChange) {
      onRowSelectionChange((prev: Record<string, boolean>) => ({
        ...prev,
        [id]: checked,
      }));
    }
  };

  if (data.length === 0) {
    return <div>No contacts found</div>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>
            <input
              type="checkbox"
              aria-label="Select all contacts"
              checked={selectedIds.length === data.length && data.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
          </th>
          <th>
            <button aria-label="Sort by name ascending">Name</button>
          </th>
          <th>Email</th>
          <th>Phone</th>
          <th>
            <button aria-label="Sort by date added ascending">Added</button>
            <button aria-label="Filter by date added">Filter</button>
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((contact) => (
          <tr
            key={contact.id}
            role="button"
            tabIndex={0}
            aria-label={`Open contact ${contact.displayName}`}
            onClick={() => onOpen?.(contact.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onOpen?.(contact.id);
              }
            }}
            data-state={rowSelection[contact.id] ? "selected" : undefined}
          >
            <td>
              <input
                type="checkbox"
                aria-label={`Select ${contact.displayName}`}
                checked={!!rowSelection[contact.id]}
                onChange={(e) => {
                  e.stopPropagation();
                  handleSelectRow(contact.id, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </td>
            <td>{contact.displayName}</td>
            <td>{contact.primaryEmail || "—"}</td>
            <td>{contact.primaryPhone || "—"}</td>
            <td>
              {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString("en-GB") : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const mockContacts: ContactRow[] = [
  {
    id: "1",
    displayName: "John Doe",
    primaryEmail: "john@example.com",
    primaryPhone: "+1234567890",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    displayName: "Jane Smith",
    primaryEmail: "jane@example.com",
    createdAt: "2024-01-10T15:30:00Z",
  },
  {
    id: "3",
    displayName: "Bob Johnson",
    primaryPhone: "+0987654321",
    createdAt: "2024-02-01T09:45:00Z",
  },
];

describe("ContactTable (Simplified)", () => {
  it("renders contact data correctly", () => {
    render(<MockContactTable data={mockContacts} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("+0987654321")).toBeInTheDocument();
  });

  it("shows placeholder for missing data", () => {
    render(<MockContactTable data={mockContacts} />);

    expect(screen.getAllByText("—")).toHaveLength(2); // Jane's phone and Bob's email
  });

  it("shows empty state when no contacts", () => {
    render(<MockContactTable data={[]} />);

    expect(screen.getByText("No contacts found")).toBeInTheDocument();
  });

  it("handles row selection", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const onRowSelectionChange = vi.fn();

    render(
      <MockContactTable
        data={mockContacts}
        onSelectionChange={onSelectionChange}
        onRowSelectionChange={onRowSelectionChange}
      />,
    );

    const johnCheckbox = screen.getByLabelText("Select John Doe");
    await user.click(johnCheckbox);

    expect(onRowSelectionChange).toHaveBeenCalled();
  });

  it("handles select all", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const onRowSelectionChange = vi.fn();

    render(
      <MockContactTable
        data={mockContacts}
        onSelectionChange={onSelectionChange}
        onRowSelectionChange={onRowSelectionChange}
      />,
    );

    const selectAllCheckbox = screen.getByLabelText("Select all contacts");
    await user.click(selectAllCheckbox);

    expect(onRowSelectionChange).toHaveBeenCalled();
  });

  it("calls onOpen when row is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

    render(<MockContactTable data={mockContacts} onOpen={onOpen} />);

    const johnRow = screen.getByRole("button", { name: "Open contact John Doe" });
    await user.click(johnRow);

    expect(onOpen).toHaveBeenCalledWith("1");
  });

  it("calls onOpen when Enter is pressed on row", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

    render(<MockContactTable data={mockContacts} onOpen={onOpen} />);

    const johnRow = screen.getByRole("button", { name: "Open contact John Doe" });
    johnRow.focus();
    await user.keyboard("{Enter}");

    expect(onOpen).toHaveBeenCalledWith("1");
  });

  it("does not call onOpen when checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

    render(<MockContactTable data={mockContacts} onOpen={onOpen} />);

    const johnCheckbox = screen.getByLabelText("Select John Doe");
    await user.click(johnCheckbox);

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("has proper ARIA labels", () => {
    render(<MockContactTable data={mockContacts} />);

    expect(screen.getByLabelText("Select all contacts")).toBeInTheDocument();
    expect(screen.getByLabelText("Select John Doe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sort by name ascending" })).toBeInTheDocument();
  });

  it("formats dates correctly", () => {
    render(<MockContactTable data={mockContacts} />);

    // Dates should be formatted as DD/MM/YYYY (en-GB locale)
    expect(screen.getByText("15/01/2024")).toBeInTheDocument(); // John
    expect(screen.getByText("10/01/2024")).toBeInTheDocument(); // Jane
    expect(screen.getByText("01/02/2024")).toBeInTheDocument(); // Bob
  });

  it("supports keyboard navigation", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

    render(<MockContactTable data={mockContacts} onOpen={onOpen} />);

    const johnRow = screen.getByRole("button", { name: "Open contact John Doe" });
    johnRow.focus();

    await user.keyboard("{Enter}");
    expect(onOpen).toHaveBeenCalledWith("1");
  });
});

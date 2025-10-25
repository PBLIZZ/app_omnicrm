import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotesDateIndex } from "../NotesDateIndex";
import type { Note } from "@/server/db/schema";

// Mock date-fns
vi.mock("date-fns", () => ({
  format: vi.fn((date, formatStr) => {
    const d = new Date(date);
    if (formatStr === "MMM yyyy") {
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    return d.toLocaleDateString();
  }),
  isSameMonth: vi.fn((date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  }),
  isSameYear: vi.fn((date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear();
  }),
}));

// Mock the UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: any) => (
    <div className={className} data-testid="scroll-area">
      {children}
    </div>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}));

describe("NotesDateIndex", () => {
  const mockNotes: Note[] = [
    {
      id: "note-1",
      userId: "user-1",
      contactId: "contact-1",
      contentPlain: "Note 1",
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
      contentPlain: "Note 2",
      contentRich: {},
      piiEntities: [],
      sourceType: "typed",
      createdAt: new Date("2024-01-20"),
      updatedAt: new Date("2024-01-20"),
    },
    {
      id: "note-3",
      userId: "user-1",
      contactId: "contact-1",
      contentPlain: "Note 3",
      contentRich: {},
      piiEntities: [],
      sourceType: "typed",
      createdAt: new Date("2024-02-10"),
      updatedAt: new Date("2024-02-10"),
    },
    {
      id: "note-4",
      userId: "user-1",
      contactId: "contact-1",
      contentPlain: "Note 4",
      contentRich: {},
      piiEntities: [],
      sourceType: "typed",
      createdAt: new Date("2024-02-15"),
      updatedAt: new Date("2024-02-15"),
    },
  ];

  const mockOnDateClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render date groups sorted by date descending", () => {
    render(<NotesDateIndex notes={mockNotes} onDateClick={mockOnDateClick} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2); // Feb 2024 and Jan 2024

    // Should be sorted with most recent first
    expect(buttons[0]).toHaveTextContent("Feb 2024");
    expect(buttons[1]).toHaveTextContent("Jan 2024");
  });

  it("should show note counts for each month", () => {
    render(<NotesDateIndex notes={mockNotes} onDateClick={mockOnDateClick} />);

    const buttons = screen.getAllByRole("button");

    // Feb 2024 has 2 notes
    expect(buttons[0]).toHaveTextContent("2");

    // Jan 2024 has 2 notes
    expect(buttons[1]).toHaveTextContent("2");
  });

  it("should call onDateClick with correct date when button is clicked", () => {
    render(<NotesDateIndex notes={mockNotes} onDateClick={mockOnDateClick} />);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // Feb 2024

    expect(mockOnDateClick).toHaveBeenCalledWith(expect.any(Date));

    // Verify the date is from Feb 2024
    const calledDate = mockOnDateClick.mock.calls[0][0];
    expect(calledDate.getMonth()).toBe(1); // February (0-indexed)
    expect(calledDate.getFullYear()).toBe(2024);
  });

  it("should not render when no notes provided", () => {
    const { container } = render(<NotesDateIndex notes={[]} onDateClick={mockOnDateClick} />);
    expect(container.firstChild).toBeNull();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <NotesDateIndex notes={mockNotes} onDateClick={mockOnDateClick} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should group notes by month and year correctly", () => {
    const notesWithSameMonth: Note[] = [
      {
        id: "note-1",
        userId: "user-1",
        contactId: "contact-1",
        contentPlain: "Note 1",
        contentRich: {},
        piiEntities: [],
        sourceType: "typed",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
      {
        id: "note-2",
        userId: "user-1",
        contactId: "contact-1",
        contentPlain: "Note 2",
        contentRich: {},
        piiEntities: [],
        sourceType: "typed",
        createdAt: new Date("2024-01-31"),
        updatedAt: new Date("2024-01-31"),
      },
    ];

    render(<NotesDateIndex notes={notesWithSameMonth} onDateClick={mockOnDateClick} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent("Jan 2024");
    expect(buttons[0]).toHaveTextContent("2"); // Count of 2
  });

  it("should handle notes from different years", () => {
    const notesWithDifferentYears: Note[] = [
      {
        id: "note-1",
        userId: "user-1",
        contactId: "contact-1",
        contentPlain: "Note 1",
        contentRich: {},
        piiEntities: [],
        sourceType: "typed",
        createdAt: new Date("2023-12-15"),
        updatedAt: new Date("2023-12-15"),
      },
      {
        id: "note-2",
        userId: "user-1",
        contactId: "contact-1",
        contentPlain: "Note 2",
        contentRich: {},
        piiEntities: [],
        sourceType: "typed",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
      },
    ];

    render(<NotesDateIndex notes={notesWithDifferentYears} onDateClick={mockOnDateClick} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);

    // Should be sorted with most recent first
    expect(buttons[0]).toHaveTextContent("Jan 2024");
    expect(buttons[1]).toHaveTextContent("Dec 2023");
  });

  it("should render scroll area with correct structure", () => {
    render(<NotesDateIndex notes={mockNotes} onDateClick={mockOnDateClick} />);

    expect(screen.getByTestId("scroll-area")).toBeInTheDocument();
    expect(screen.getByText("Date Index")).toBeInTheDocument();
  });
});

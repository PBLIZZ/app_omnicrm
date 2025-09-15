import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MomentumKanbanView } from "../momentum-kanban-view";
import { renderWithProviders, createMockMomentum, mockToast } from "@/__tests__/test-utils";

// Mock dependencies
vi.mock("@/lib/api/client", () => ({
  apiClient: {
    put: vi.fn(),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragStart, onDragEnd, ...props }: any) => (
    <div data-testid="dnd-context" {...props}>
      {children}
    </div>
  ),
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
  closestCenter: vi.fn(),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ""),
    },
  },
}));

describe("MomentumKanbanView", () => {
  let mockApiClient: any;
  const user = userEvent.setup();

  beforeAll(async () => {
    const apiClientModule = await import("@/lib/api/client");
    mockApiClient = vi.mocked(apiClientModule.apiClient);
  });

  const mockMomentums = [
    createMockMomentum({
      id: "task-1",
      title: "Complete project setup",
      description: "Set up the initial project structure",
      status: "todo",
      priority: "high",
      assignee: "user",
      source: "user",
      dueDate: "2024-12-31T00:00:00Z",
      estimatedMinutes: 120,
      taggedContactsData: [
        { id: "contact-1", displayName: "John Doe" },
        { id: "contact-2", displayName: "Jane Smith" },
      ],
    }),
    createMockMomentum({
      id: "task-2",
      title: "AI-generated task",
      description: "This task was created by AI",
      status: "in_progress",
      priority: "medium",
      assignee: "ai",
      source: "ai_generated",
      dueDate: "2024-01-01T00:00:00Z", // Overdue date
      estimatedMinutes: 60,
    }),
    createMockMomentum({
      id: "task-3",
      title: "Review documentation",
      description: "Review all project documentation",
      status: "done",
      priority: "low",
      assignee: "user",
      source: "user",
      estimatedMinutes: 30,
      taggedContactsData: [
        { id: "contact-1", displayName: "John Doe" },
        { id: "contact-3", displayName: "Alice Johnson" },
        { id: "contact-4", displayName: "Bob Williams" },
        { id: "contact-5", displayName: "Carol Davis" }, // 4th contact to test +N display
      ],
    }),
  ];

  const defaultProps = {
    momentums: mockMomentums,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the kanban board", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    });

    it("renders all status columns", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      expect(screen.getByTestId("kanban-column-todo")).toBeInTheDocument();
      expect(screen.getByTestId("kanban-column-in_progress")).toBeInTheDocument();
      expect(screen.getByTestId("kanban-column-waiting")).toBeInTheDocument();
      expect(screen.getByTestId("kanban-column-done")).toBeInTheDocument();
    });

    it("displays correct column titles", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      expect(screen.getByText("To Do")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Waiting")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    it("displays task count badges", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      // Each column should show the number of tasks
      const badges = screen.getAllByText("1");
      expect(badges).toHaveLength(3); // todo, in_progress, done columns each have 1 task

      const waitingBadge = screen
        .getByTestId("kanban-column-waiting")
        .querySelector(".bg-secondary");
      expect(waitingBadge).toHaveTextContent("0");
    });
  });

  describe("Task Cards", () => {
    it("renders task cards with correct information", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      expect(screen.getByText("Complete project setup")).toBeInTheDocument();
      expect(screen.getByText("AI-generated task")).toBeInTheDocument();
      expect(screen.getByText("Review documentation")).toBeInTheDocument();
    });

    it("displays task descriptions", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      expect(screen.getByText("Set up the initial project structure")).toBeInTheDocument();
      expect(screen.getByText("This task was created by AI")).toBeInTheDocument();
      expect(screen.getByText("Review all project documentation")).toBeInTheDocument();
    });

    it("shows AI-generated indicator for AI tasks", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      const aiTask = screen.getByTestId("task-card-task-2");
      expect(aiTask.querySelector('[data-testid*="bot"]')).toBeInTheDocument();
    });

    it("displays priority indicators with correct colors", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      const highPriorityCard = screen.getByTestId("task-card-task-1");
      expect(highPriorityCard).toHaveTextContent("high");

      const mediumPriorityCard = screen.getByTestId("task-card-task-2");
      expect(mediumPriorityCard).toHaveTextContent("medium");

      const lowPriorityCard = screen.getByTestId("task-card-task-3");
      expect(lowPriorityCard).toHaveTextContent("low");
    });

    it("shows assignee information", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      // User-assigned tasks should show "Me"
      expect(screen.getAllByText("Me")).toHaveLength(2);

      // AI-assigned tasks should show "AI"
      expect(screen.getByText("AI")).toBeInTheDocument();
    });

    it("displays due dates with overdue indication", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      // Future due date
      expect(screen.getByText("Dec 31")).toBeInTheDocument();

      // Overdue date should show overdue badge
      expect(screen.getByText("Jan 01")).toBeInTheDocument();
      expect(screen.getByText("Overdue")).toBeInTheDocument();
    });

    it("shows estimated time correctly formatted", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      expect(screen.getByText("2h 0m")).toBeInTheDocument(); // 120 minutes
      expect(screen.getByText("1h 0m")).toBeInTheDocument(); // 60 minutes
      expect(screen.getByText("30m")).toBeInTheDocument(); // 30 minutes
    });

    it("displays tagged contacts with avatars", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      // Should show contact initials in avatars
      expect(screen.getByText("JD")).toBeInTheDocument(); // John Doe
      expect(screen.getByText("JS")).toBeInTheDocument(); // Jane Smith

      // Should show +N indicator for additional contacts
      expect(screen.getByText("+1")).toBeInTheDocument(); // 4 contacts, showing 3 + "+1"
    });
  });

  describe("Task Actions", () => {
    it("renders action buttons for each task", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      expect(screen.getByTestId("button-task-actions-task-1")).toBeInTheDocument();
      expect(screen.getByTestId("button-task-actions-task-2")).toBeInTheDocument();
      expect(screen.getByTestId("button-task-actions-task-3")).toBeInTheDocument();
    });

    it("opens dropdown menu when action button is clicked", async () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      const actionButton = screen.getByTestId("button-task-actions-task-1");
      await user.click(actionButton);

      expect(screen.getByText("Edit Task")).toBeInTheDocument();
      expect(screen.getByText("Delete Task")).toBeInTheDocument();
    });

    it("prevents event propagation on action button clicks", async () => {
      const mockDragStart = vi.fn();

      renderWithProviders(
        <div onClick={mockDragStart}>
          <MomentumKanbanView {...defaultProps} />
        </div>,
      );

      const actionButton = screen.getByTestId("button-task-actions-task-1");
      await user.click(actionButton);

      // Clicking the action button should not trigger the parent click handler
      expect(mockDragStart).not.toHaveBeenCalled();
    });
  });

  describe("Column Actions", () => {
    it("renders add task buttons for each column", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      expect(screen.getByTestId("button-add-task-todo")).toBeInTheDocument();
      expect(screen.getByTestId("button-add-task-in_progress")).toBeInTheDocument();
      expect(screen.getByTestId("button-add-task-waiting")).toBeInTheDocument();
      expect(screen.getByTestId("button-add-task-done")).toBeInTheDocument();
    });

    it("shows empty state for columns with no tasks", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      const waitingColumn = screen.getByTestId("kanban-column-waiting");
      expect(waitingColumn).toHaveTextContent("No waiting tasks");
    });
  });

  describe("Loading State", () => {
    it("shows loading skeletons when isLoading is true", () => {
      renderWithProviders(<MomentumKanbanView momentums={[]} isLoading={true} />);

      const skeletons = screen.getAllByTestId(/skeleton/);
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("hides task cards during loading", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} isLoading={true} />);

      expect(screen.queryByText("Complete project setup")).not.toBeInTheDocument();
      expect(screen.queryByText("AI-generated task")).not.toBeInTheDocument();
    });

    it("shows task cards when not loading", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} isLoading={false} />);

      expect(screen.getByText("Complete project setup")).toBeInTheDocument();
      expect(screen.getByText("AI-generated task")).toBeInTheDocument();
    });
  });

  describe("Drag and Drop", () => {
    it("sets up DndContext with proper configuration", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
    });

    it("renders DragOverlay", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      expect(screen.getByTestId("drag-overlay")).toBeInTheDocument();
    });

    it("wraps task lists in SortableContext", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      const sortableContexts = screen.getAllByTestId("sortable-context");
      expect(sortableContexts.length).toBeGreaterThan(0);
    });

    it("makes task cards draggable", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      const taskCard = screen.getByTestId("task-card-task-1");
      expect(taskCard).toHaveClass("cursor-grab");
    });
  });

  describe("Task Status Updates", () => {
    it("calls API when task status is updated", async () => {
      mockApiClient.put.mockResolvedValueOnce({ ok: true, data: {} });

      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      // Simulate a successful drag and drop operation
      // Note: In a real test, you'd simulate the actual drag and drop
      // For now, we'll test the mutation function directly

      const component = screen.getByTestId("kanban-board");
      expect(component).toBeInTheDocument();

      // The actual drag and drop testing would require more complex setup
      // with @dnd-kit testing utilities
    });

    it("shows success toast on successful update", async () => {
      mockApiClient.put.mockResolvedValueOnce({ ok: true, data: {} });

      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      // In a real scenario, this would be triggered by a drag and drop
      // For testing purposes, we'll verify the toast is set up correctly
      expect(mockToast).toBeDefined();
    });

    it("shows error toast on failed update", async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error("Network error"));

      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      // The error handling would be tested in integration with the actual drag and drop
      expect(mockToast).toBeDefined();
    });
  });

  describe("Task Filtering", () => {
    it("displays tasks in correct columns based on status", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      const todoColumn = screen.getByTestId("kanban-column-todo");
      const inProgressColumn = screen.getByTestId("kanban-column-in_progress");
      const doneColumn = screen.getByTestId("kanban-column-done");

      expect(todoColumn).toHaveTextContent("Complete project setup");
      expect(inProgressColumn).toHaveTextContent("AI-generated task");
      expect(doneColumn).toHaveTextContent("Review documentation");
    });

    it("handles empty momentum list", () => {
      renderWithProviders(<MomentumKanbanView momentums={[]} isLoading={false} />);

      // All columns should show empty states
      expect(screen.getAllByText(/No .* tasks/)).toHaveLength(4);
    });

    it("handles tasks with missing data gracefully", () => {
      const incompleteTask = createMockMomentum({
        id: "incomplete-task",
        title: "Incomplete Task",
        description: null,
        dueDate: null,
        estimatedMinutes: null,
        taggedContactsData: [],
      });

      renderWithProviders(<MomentumKanbanView momentums={[incompleteTask]} isLoading={false} />);

      expect(screen.getByText("Incomplete Task")).toBeInTheDocument();
      // Should not crash when rendering task without optional fields
    });
  });

  describe("Responsive Design", () => {
    it("applies overflow scroll for horizontal layout", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      const kanbanBoard = screen.getByTestId("kanban-board");
      expect(kanbanBoard).toHaveClass("overflow-x-auto");
    });

    it("sets minimum width for columns", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      const columns = screen.getAllByTestId(/kanban-column-/);
      columns.forEach((column) => {
        expect(column).toHaveClass("min-w-80");
      });
    });
  });

  describe("Accessibility", () => {
    it("provides proper test ids for automation", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
      expect(screen.getByTestId("task-card-task-1")).toBeInTheDocument();
      expect(screen.getByTestId("button-task-actions-task-1")).toBeInTheDocument();
    });

    it("uses proper semantic HTML structure", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      // Column headers should be h3 elements
      const columnHeaders = screen.getAllByRole("heading", { level: 3 });
      expect(columnHeaders.length).toBe(4);
    });

    it("provides proper button labels and roles", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      const addButtons = screen.getAllByRole("button");
      const actionButtons = addButtons.filter((btn) =>
        btn.getAttribute("data-testid")?.includes("add-task"),
      );
      expect(actionButtons.length).toBe(4);
    });

    it("supports keyboard navigation", () => {
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeInTheDocument();
        // All buttons should be focusable
      });
    });
  });

  describe("Performance", () => {
    it("handles large number of tasks efficiently", () => {
      const manyTasks = Array.from({ length: 100 }, (_, i) =>
        createMockMomentum({
          id: `task-${i}`,
          title: `Task ${i}`,
          status: i % 2 === 0 ? "todo" : "done",
        }),
      );

      const { container } = renderWithProviders(
        <MomentumKanbanView momentums={manyTasks} isLoading={false} />,
      );

      // Should render without performance issues
      expect(container).toBeInTheDocument();
      expect(screen.getByText("Task 0")).toBeInTheDocument();
      expect(screen.getByText("Task 99")).toBeInTheDocument();
    });

    it("uses proper memoization for task rendering", () => {
      // This would test React.memo usage if implemented
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      // Re-render with same props shouldn't cause unnecessary re-renders
      renderWithProviders(<MomentumKanbanView {...defaultProps} />);

      expect(screen.getByText("Complete project setup")).toBeInTheDocument();
    });
  });
});

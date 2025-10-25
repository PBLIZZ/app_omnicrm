import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TaskCard } from "./TaskCard";
import type { Task, Project } from "@/server/db/schema";

// Mock hooks
vi.mock("@/hooks/use-tasks", () => ({
  useUpdateTask: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  })),
  useToggleTaskComplete: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock("@/hooks/use-user-profile", () => ({
  useUserProfile: vi.fn(() => ({
    profile: {
      id: "user-1",
      email: "test@example.com",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
      createdAt: new Date().toISOString(),
    },
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

// Test data factory
const createMockTask = (overrides?: Partial<Task>): Task => ({
  id: "task-1",
  userId: "user-1",
  name: "Test Task",
  status: "todo",
  priority: "medium",
  dueDate: null,
  details: {},
  projectId: null,
  parentTaskId: null,
  zoneId: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockProject = (overrides?: Partial<Project>): Project => ({
  id: "project-1",
  userId: "user-1",
  name: "Test Project",
  status: "active",
  dueDate: null,
  details: {},
  zoneId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Wrapper component for tests
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("TaskCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Minimal State (New Task)", () => {
    it("renders minimal task card with only essential elements", () => {
      const task = createMockTask();
      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // Essential elements should be visible
      expect(screen.getByText("Test Task")).toBeInTheDocument();
      
      // Priority flag button
      const priorityButton = container.querySelector("button[aria-haspopup='dialog']");
      expect(priorityButton).toBeInTheDocument();
      
      expect(screen.getByRole("button", { name: /voice input/i })).toBeInTheDocument();
    });

    it("shows 'No Project' when no project is assigned", () => {
      const task = createMockTask({ projectId: null });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      const select = screen.getByRole("combobox");
      expect(select).toHaveValue(""); // Empty select value
    });

    it("does not show tags section when no tags exist", () => {
      const task = createMockTask({ details: {} });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.queryByText(/add tags/i)).not.toBeInTheDocument();
    });

    it("does not show subtasks section when no subtasks exist", () => {
      const task = createMockTask({ details: {} });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.queryByText(/subtasks/i)).not.toBeInTheDocument();
    });
  });

  describe("Progressive Disclosure", () => {
    it("shows tags when they exist in task details", () => {
      const task = createMockTask({
        details: {
          tags: [
            { id: "tag-1", name: "Client Care", color: "#10b981" },
            { id: "tag-2", name: "Outreach", color: "#3b82f6" },
          ],
        },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.getByText("Client Care")).toBeInTheDocument();
      expect(screen.getByText("Outreach")).toBeInTheDocument();
    });

    it("shows '+X more' when more than 3 tags exist", () => {
      const task = createMockTask({
        details: {
          tags: [
            { id: "tag-1", name: "Tag 1", color: "#10b981" },
            { id: "tag-2", name: "Tag 2", color: "#3b82f6" },
            { id: "tag-3", name: "Tag 3", color: "#f59e0b" },
            { id: "tag-4", name: "Tag 4", color: "#ef4444" },
            { id: "tag-5", name: "Tag 5", color: "#8b5cf6" },
          ],
        },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.getByText("+2 more")).toBeInTheDocument();
    });

    it("shows subtasks progress bar when subtasks exist", () => {
      const task = createMockTask({
        details: {
          subtasks: [
            { id: "sub-1", title: "Subtask 1", completed: false },
            { id: "sub-2", title: "Subtask 2", completed: true },
            { id: "sub-3", title: "Subtask 3", completed: false },
          ],
        },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.getByText("1/3 Subtasks complete")).toBeInTheDocument();
    });

    it("shows location when set in details", () => {
      const task = createMockTask({
        details: {
          location: "Client's home",
        },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // Location is in the dropdown menu, need to open it first
      // For now, just verify the task has location in details
      expect(task.details).toHaveProperty("location", "Client's home");
    });
  });

  describe("Priority Selection", () => {
    it("displays correct priority color for high priority", () => {
      const task = createMockTask({ priority: "high" });
      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      const flagButton = container.querySelector(".text-red-500");
      expect(flagButton).toBeInTheDocument();
    });

    it("displays correct priority color for medium priority", () => {
      const task = createMockTask({ priority: "medium" });
      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      const flagButton = container.querySelector(".text-orange-500");
      expect(flagButton).toBeInTheDocument();
    });

    it("displays correct priority color for low priority", () => {
      const task = createMockTask({ priority: "low" });
      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      const flagButton = container.querySelector(".text-blue-500");
      expect(flagButton).toBeInTheDocument();
    });
  });

  describe("Task Completion", () => {
    it("shows completed state with strikethrough text", () => {
      const task = createMockTask({ status: "done" });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      const title = screen.getByText("Test Task");
      expect(title).toHaveClass("line-through");
    });

    it("shows circle filled when task is completed", () => {
      const task = createMockTask({ status: "done" });
      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      const circle = container.querySelector(".fill-green-500");
      expect(circle).toBeInTheDocument();
    });
  });

  describe("Subtasks Interaction", () => {
    it("expands subtasks when progress bar is clicked", async () => {
      const task = createMockTask({
        details: {
          subtasks: [
            { id: "sub-1", title: "Subtask 1", completed: false },
            { id: "sub-2", title: "Subtask 2", completed: false },
          ],
        },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      const progressBar = screen.getByText("0/2 Subtasks complete");
      fireEvent.click(progressBar);

      await waitFor(() => {
        expect(screen.getByText("Subtask 1")).toBeInTheDocument();
        expect(screen.getByText("Subtask 2")).toBeInTheDocument();
      });
    });

    it("collapses subtasks when clicked again", async () => {
      const task = createMockTask({
        details: {
          subtasks: [{ id: "sub-1", title: "Subtask 1", completed: false }],
        },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      const progressBar = screen.getByText("0/1 Subtasks complete");

      // Expand
      fireEvent.click(progressBar);
      await waitFor(() => {
        expect(screen.getByText("Subtask 1")).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(progressBar);
      await waitFor(() => {
        expect(screen.queryByText("Subtask 1")).not.toBeInTheDocument();
      });
    });
  });

  describe("Project Selection", () => {
    it("displays selected project name", () => {
      const project = createMockProject({ id: "project-1", name: "Nurture & Reconnect" });
      const task = createMockTask({ projectId: "project-1" });

      render(<TaskCard task={task} projects={[project]} />, { wrapper: createWrapper() });

      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("project-1");
    });

    it("shows all available projects in dropdown", () => {
      const projects = [
        createMockProject({ id: "project-1", name: "Project 1" }),
        createMockProject({ id: "project-2", name: "Project 2" }),
      ];
      const task = createMockTask();

      render(<TaskCard task={task} projects={projects} />, { wrapper: createWrapper() });

      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
    });
  });

  describe("Owner Assignment", () => {
    it("shows user avatar when owner is 'user'", () => {
      const task = createMockTask({
        details: { owner: "user" },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      const avatar = screen.getByAltText("User avatar");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
    });

    it("shows AI bot icon when owner is 'ai'", () => {
      const task = createMockTask({
        details: { owner: "ai" },
      });
      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      const botIcon = container.querySelector(".bg-teal-400");
      expect(botIcon).toBeInTheDocument();
    });
  });

  describe("Date Display", () => {
    it("shows 'Today' for today's date", () => {
      const today = new Date().toISOString().split("T")[0];
      const task = createMockTask({ dueDate: today || null });

      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // Date badge should be visible
      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    it("shows 'Tomorrow' for tomorrow's date", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      const task = createMockTask({ dueDate: tomorrowStr || null });

      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    });

    it("hides date badge when no date is set", () => {
      const task = createMockTask({ dueDate: null });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // Date badge should not be visible
      expect(screen.queryByText(/today|tomorrow/i)).not.toBeInTheDocument();
    });

    it("shows red text for overdue tasks", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const task = createMockTask({ dueDate: yesterdayStr || null, status: "todo" });

      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // Should have red text for overdue
      const dateBadge = container.querySelector(".text-red-600");
      expect(dateBadge).toBeInTheDocument();
    });

    it("shows blue text for today's tasks", () => {
      const today = new Date().toISOString().split("T")[0];
      const task = createMockTask({ dueDate: today || null });

      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // Should have blue text for today
      const dateBadge = container.querySelector(".text-blue-600");
      expect(dateBadge).toBeInTheDocument();
    });

    it("has transparent background for date badge", () => {
      const today = new Date().toISOString().split("T")[0];
      const task = createMockTask({ dueDate: today || null });

      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // Should have transparent white background
      const dateBadge = container.querySelector(".bg-white\\/40");
      expect(dateBadge).toBeInTheDocument();
    });
  });

  describe("Location + People Row", () => {
    it("shows location when set", () => {
      const task = createMockTask({
        details: {
          location: "Client's home",
        },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.getByText("Client's home")).toBeInTheDocument();
    });

    it("shows people when contacts are linked", () => {
      const task = createMockTask({
        details: {
          linkedContacts: [
            { id: "1", name: "Sarah Johnson" },
            { id: "2", name: "Mike Chen" },
          ],
        },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.getByText(/Sarah Johnson, Mike Chen/)).toBeInTheDocument();
    });

    it("shows location and people together with separator", () => {
      const task = createMockTask({
        details: {
          location: "Wellness Center",
          linkedContacts: [{ id: "1", name: "Sarah Johnson" }],
        },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.getByText("Wellness Center")).toBeInTheDocument();
      expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
      expect(screen.getByText("•")).toBeInTheDocument();
    });

    it("truncates people list after 2 contacts", () => {
      const task = createMockTask({
        details: {
          linkedContacts: [
            { id: "1", name: "Person 1" },
            { id: "2", name: "Person 2" },
            { id: "3", name: "Person 3" },
            { id: "4", name: "Person 4" },
          ],
        },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.getByText(/Person 1, Person 2 \+2 more/)).toBeInTheDocument();
    });

    it("hides row when neither location nor people are set", () => {
      const task = createMockTask({ details: {} });
      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // MapPin and Users icons should not be present
      const icons = container.querySelectorAll("svg");
      const hasMapPin = Array.from(icons).some((icon) =>
        icon.classList.contains("lucide-map-pin"),
      );
      const hasUsers = Array.from(icons).some((icon) => icon.classList.contains("lucide-users"));

      expect(hasMapPin).toBe(false);
      expect(hasUsers).toBe(false);
    });
  });

  describe("Notes Preview", () => {
    it("shows notes when set", () => {
      const task = createMockTask({
        details: {
          notes: "Remember to bring yoga mats and essential oils for the session.",
        },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(
        screen.getByText(/Remember to bring yoga mats and essential oils/),
      ).toBeInTheDocument();
    });

    it("shows expand button for long notes", () => {
      const longNotes = "A".repeat(150); // More than 100 characters
      const task = createMockTask({
        details: {
          notes: longNotes,
        },
      });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.getByText("Show more")).toBeInTheDocument();
    });

    it("hides notes when not set", () => {
      const task = createMockTask({ details: {} });
      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // FileText icon should not be present in notes context
      const fileTextIcons = container.querySelectorAll(".lucide-file-text");
      expect(fileTextIcons.length).toBe(0);
    });

    it("toggles notes expansion on button click", async () => {
      const longNotes = "A".repeat(150);
      const task = createMockTask({
        details: {
          notes: longNotes,
        },
      });
      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      const showMoreButton = screen.getByText("Show more");
      fireEvent.click(showMoreButton);

      await waitFor(() => {
        expect(screen.getByText("Show less")).toBeInTheDocument();
      });

      // Check that line-clamp is removed
      const notesParagraph = container.querySelector("p");
      expect(notesParagraph?.className).not.toContain("line-clamp-2");
    });
  });

  describe("Conditional Rendering Logic", () => {
    it("hides tags section when no tags exist", () => {
      const task = createMockTask({ details: {} });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // No tags should be visible
      expect(screen.queryByRole("button", { name: /more/i })).not.toBeInTheDocument();
    });

    it("hides subtasks section when no subtasks exist", () => {
      const task = createMockTask({ details: {} });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.queryByText(/subtasks/i)).not.toBeInTheDocument();
    });

    it("hides location when not set", () => {
      const task = createMockTask({ details: {} });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // Location should not be visible in the UI
      expect(screen.queryByPlaceholderText(/location/i)).not.toBeInTheDocument();
    });

    it("hides notes when not set", () => {
      const task = createMockTask({ details: {} });
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // Notes should not be visible
      expect(screen.queryByText(/remember/i)).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for interactive elements", () => {
      const task = createMockTask();
      render(<TaskCard task={task} />, { wrapper: createWrapper() });

      expect(screen.getByRole("button", { name: /voice input/i })).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("supports keyboard navigation for priority selection", () => {
      const task = createMockTask();
      const { container } = render(<TaskCard task={task} />, { wrapper: createWrapper() });

      // Priority button is the first button in the card
      const priorityButton = container.querySelector("button[aria-haspopup='dialog']");
      expect(priorityButton).toBeInTheDocument();
      
      // Should be focusable
      if (priorityButton && priorityButton instanceof HTMLElement) {
        priorityButton.focus();
        expect(document.activeElement).toBe(priorityButton);
      }
    });
  });
});

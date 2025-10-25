import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OmniMomentumPage } from "./OmniMomentumPage";

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Wrapper component for tests
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);

// Mock all child components
vi.mock("./TodaysFocusSection", () => ({
  TodaysFocusSection: () => <div data-testid="todays-focus">Today's Focus Section</div>,
}));

vi.mock("./DailyPulseWidget", () => ({
  DailyPulseWidget: () => <div data-testid="daily-pulse">Daily Pulse Widget</div>,
}));

vi.mock("./HabitTrackers", () => ({
  HabitTrackers: () => <div data-testid="habit-trackers">Habit Trackers</div>,
}));

vi.mock("./MagicInboxCard", () => ({
  MagicInboxCard: () => <div data-testid="magic-inbox">Magic Inbox Card</div>,
}));

vi.mock("./WellnessQuoteCard", () => ({
  WellnessQuoteCard: () => <div data-testid="wellness-quote">Wellness Quote Card</div>,
}));

vi.mock("./ActionsListView", () => ({
  ActionsListView: () => <div data-testid="actions-list">Actions List View</div>,
}));

vi.mock("./WellnessZoneStatus", () => ({
  WellnessZoneStatus: () => <div data-testid="zone-status">Wellness Zone Status</div>,
}));

describe("OmniMomentumPage", () => {
  it("renders all required sections in correct layout order", () => {
    render(<OmniMomentumPage />, { wrapper });

    // Verify all components are rendered
    expect(screen.getByTestId("daily-pulse")).toBeInTheDocument();
    expect(screen.getByTestId("habit-trackers")).toBeInTheDocument();
    expect(screen.getByTestId("magic-inbox")).toBeInTheDocument();
    expect(screen.getByTestId("todays-focus")).toBeInTheDocument();
    expect(screen.getByTestId("wellness-quote")).toBeInTheDocument();
    expect(screen.getByTestId("zone-status")).toBeInTheDocument();
    expect(screen.getByTestId("actions-list")).toBeInTheDocument();
  });

  it("renders top row with three cards (Daily Pulse, Habit Trackers, Magic Inbox)", () => {
    const { container } = render(<OmniMomentumPage />, { wrapper });

    // Find the first grid container (top row)
    const topRowGrids = container.querySelectorAll(".grid");
    expect(topRowGrids.length).toBeGreaterThan(0);

    // Check that top row has correct number of children
    const topRow = topRowGrids[0];
    expect(topRow?.children.length).toBe(3);
  });

  it("renders Today's Focus and Wellness Quote in second row with 3/4 and 1/4 split", () => {
    const { container } = render(<OmniMomentumPage />, { wrapper });

    const grids = container.querySelectorAll(".grid");
    expect(grids.length).toBeGreaterThanOrEqual(2);

    // Second row should have 2 children (Today's Focus 3/4 + Wellness Quote 1/4)
    const secondRow = grids[1];
    expect(secondRow?.children.length).toBe(2);

    // Check for correct column spans
    const firstChild = secondRow?.children[0];
    const secondChild = secondRow?.children[1];

    expect(firstChild?.className).toContain("lg:col-span-3");
    expect(secondChild?.className).toContain("lg:col-span-1");
  });

  it("renders Zone Status in third row (full width)", () => {
    render(<OmniMomentumPage />, { wrapper });

    const zoneStatus = screen.getByTestId("zone-status");
    expect(zoneStatus).toBeInTheDocument();

    // Check that Zone Status is in a full-width container
    const zoneStatusContainer = zoneStatus.closest(".w-full");
    expect(zoneStatusContainer).toBeInTheDocument();
  });

  it("renders Actions List in bottom row (full width)", () => {
    render(<OmniMomentumPage />, { wrapper });

    const actionsList = screen.getByTestId("actions-list");
    expect(actionsList).toBeInTheDocument();

    // Check that Actions List is in a full-width container
    const actionsListContainer = actionsList.closest(".w-full");
    expect(actionsListContainer).toBeInTheDocument();
  });

  it("has proper spacing between rows", () => {
    const { container } = render(<OmniMomentumPage />, { wrapper });

    // Check for space-y-6 class on main container
    const mainContainer = container.querySelector(".space-y-6");
    expect(mainContainer).toBeInTheDocument();
  });

  it("renders responsively with single column on mobile", () => {
    const { container } = render(<OmniMomentumPage />, { wrapper });

    // Check that grids have grid-cols-1 for mobile
    const grids = container.querySelectorAll(".grid-cols-1");
    expect(grids.length).toBeGreaterThan(0);
  });
});

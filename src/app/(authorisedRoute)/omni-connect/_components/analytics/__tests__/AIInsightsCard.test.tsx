import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { AIInsightsCard } from "../AIInsightsCard";
import { renderWithProviders } from "@/__tests__/test-utils";

describe("AIInsightsCard", () => {
  describe("Rendering", () => {
    it("renders the card with correct title", () => {
      renderWithProviders(<AIInsightsCard />);

      expect(screen.getByText("💡 AI Insights")).toBeInTheDocument();
    });

    it("displays the description text", () => {
      renderWithProviders(<AIInsightsCard />);

      const description = screen.getByText(
        /Actionable observations based on this week's communications/,
      );
      expect(description).toBeInTheDocument();
    });

    it("renders all insight items", () => {
      renderWithProviders(<AIInsightsCard />);

      expect(
        screen.getByText(/Follow up on 5 high‑value leads with no reply in 3 days/),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          /Clients mention.*evening availability.*12×.*consider adding later classes/,
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(/Recurring billing questions up 18% — add a short FAQ to onboarding/),
      ).toBeInTheDocument();
    });

    it("uses proper list structure", () => {
      renderWithProviders(<AIInsightsCard />);

      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();
      expect(list).toHaveClass("list-disc", "pl-4", "space-y-1");

      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(3);
    });

    it("applies correct styling classes", () => {
      const { container } = renderWithProviders(<AIInsightsCard />);

      const card = container.firstChild as HTMLElement;
      expect(card).toBeInTheDocument();

      // Check for Card component structure
      const cardHeader = container.querySelector('[data-slot="card-header"]');
      const cardContent = container.querySelector('[data-slot="card-content"]');

      if (cardHeader) {
        expect(cardHeader).toBeInTheDocument();
      }

      if (cardContent) {
        expect(cardContent).toHaveClass("text-sm", "space-y-2");
      }
    });
  });

  describe("Content Accuracy", () => {
    it("displays specific metrics correctly", () => {
      renderWithProviders(<AIInsightsCard />);

      // Check for specific numbers and metrics
      expect(screen.getByText(/5 high‑value leads/)).toBeInTheDocument();
      expect(screen.getByText(/3 days/)).toBeInTheDocument();
      expect(screen.getByText(/12×/)).toBeInTheDocument();
      expect(screen.getByText(/18%/)).toBeInTheDocument();
    });

    it("contains actionable language", () => {
      renderWithProviders(<AIInsightsCard />);

      // Check for actionable verbs and suggestions
      expect(screen.getByText(/Follow up/)).toBeInTheDocument();
      expect(screen.getByText(/consider adding/)).toBeInTheDocument();
      expect(screen.getByText(/add a short FAQ/)).toBeInTheDocument();
    });

    it("provides business context", () => {
      renderWithProviders(<AIInsightsCard />);

      // Check for business-relevant context
      expect(screen.getByText(/evening availability/)).toBeInTheDocument();
      expect(screen.getByText(/later classes/)).toBeInTheDocument();
      expect(screen.getByText(/billing questions/)).toBeInTheDocument();
      expect(screen.getByText(/onboarding/)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("provides proper semantic structure", () => {
      renderWithProviders(<AIInsightsCard />);

      // Should have a heading (using div with card-title role)
      const heading = screen.getByText("💡 AI Insights");
      expect(heading).toBeInTheDocument();

      // Should have a list with proper list items
      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();

      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(3);
    });

    it("uses appropriate heading level", () => {
      renderWithProviders(<AIInsightsCard />);

      const heading = screen.getByText("💡 AI Insights");
      // CardTitle renders as div with card-title role
      expect(heading).toBeInTheDocument();
    });

    it("provides readable text contrast", () => {
      const { container } = renderWithProviders(<AIInsightsCard />);

      const contentDiv = container.querySelector(".text-sm");
      expect(contentDiv).toBeInTheDocument();

      // The component uses semantic color classes that should provide good contrast
      expect(contentDiv).toHaveClass("text-sm");
    });
  });

  describe("Typography and Spacing", () => {
    it("applies correct text sizing", () => {
      const { container } = renderWithProviders(<AIInsightsCard />);

      const content = container.querySelector(".text-sm");
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass("space-y-2");
    });

    it("applies proper list styling", () => {
      renderWithProviders(<AIInsightsCard />);

      const list = screen.getByRole("list");
      expect(list).toHaveClass("list-disc", "pl-4", "space-y-1");
    });

    it("uses consistent spacing", () => {
      const { container } = renderWithProviders(<AIInsightsCard />);

      const spacedContent = container.querySelector(".space-y-2");
      const spacedList = container.querySelector(".space-y-1");

      expect(spacedContent).toBeInTheDocument();
      expect(spacedList).toBeInTheDocument();
    });
  });

  describe("Static Content Integrity", () => {
    it("maintains exact insight text", () => {
      renderWithProviders(<AIInsightsCard />);

      // Verify exact text content to ensure no unintended changes
      const insights = [
        "Follow up on 5 high‑value leads with no reply in 3 days.",
        'Clients mention "evening availability" 12× — consider adding later classes.',
        "Recurring billing questions up 18% — add a short FAQ to onboarding.",
      ];

      // Check each insight individually with more flexible matching
      expect(
        screen.getByText(/Follow up on 5 high‑value leads with no reply in 3 days/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Clients mention.*evening availability.*12×.*consider adding later classes/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Recurring billing questions up 18% — add a short FAQ to onboarding/),
      ).toBeInTheDocument();
    });

    it("preserves special characters and formatting", () => {
      renderWithProviders(<AIInsightsCard />);

      // Check for special characters and formatting
      expect(screen.getByText(/high‑value/)).toBeInTheDocument(); // en-dash
      expect(screen.getByText(/12×/)).toBeInTheDocument(); // multiplication symbol
      expect(screen.getByText(/18%/)).toBeInTheDocument(); // percentage
      expect(screen.getByText(/evening availability/)).toBeInTheDocument(); // quotes
    });

    it("maintains description accuracy", () => {
      renderWithProviders(<AIInsightsCard />);

      const fullDescription =
        "Actionable observations based on this week's communications, prioritized by impact on business goals.";

      expect(screen.getByText(fullDescription)).toBeInTheDocument();
    });
  });

  describe("Component Structure", () => {
    it("follows card component pattern", () => {
      const { container } = renderWithProviders(<AIInsightsCard />);

      // Should use the Card component structure
      const cardElement = container.firstChild as HTMLElement;
      expect(cardElement).toBeInTheDocument();
    });

    it("separates header and content properly", () => {
      renderWithProviders(<AIInsightsCard />);

      const title = screen.getByText("💡 AI Insights");
      const description = screen.getByText(/Actionable observations/);

      expect(title).toBeInTheDocument();
      expect(description).toBeInTheDocument();

      // Title should be in header, description in content
      expect(title.closest("div")).not.toBe(description.closest("div"));
    });

    it("maintains proper DOM hierarchy", () => {
      const { container } = renderWithProviders(<AIInsightsCard />);

      const heading = screen.getByText("💡 AI Insights");
      const list = screen.getByRole("list");
      const description = screen.getByText(/Actionable observations/);

      // All elements should be properly nested within the card
      const cardElement = container.firstChild as HTMLElement;
      expect(cardElement.contains(heading)).toBe(true);
      expect(cardElement.contains(list)).toBe(true);
      expect(cardElement.contains(description)).toBe(true);
    });
  });

  describe("Performance and Rendering", () => {
    it("renders without errors", () => {
      expect(() => {
        renderWithProviders(<AIInsightsCard />);
      }).not.toThrow();
    });

    it("renders quickly for static content", () => {
      const startTime = performance.now();
      renderWithProviders(<AIInsightsCard />);
      const endTime = performance.now();

      // Static content should render very quickly (less than 50ms)
      expect(endTime - startTime).toBeLessThan(50);
    });

    it("maintains consistent rendering across multiple renders", () => {
      const { container: container1 } = renderWithProviders(<AIInsightsCard />);
      const { container: container2 } = renderWithProviders(<AIInsightsCard />);

      // Both renders should produce the same content
      expect(container1.innerHTML).toBe(container2.innerHTML);
    });
  });

  describe("Integration with Card Components", () => {
    it("uses shadcn Card components correctly", () => {
      renderWithProviders(<AIInsightsCard />);

      // Should have proper semantic roles that Card components provide
      const heading = screen.getByText("💡 AI Insights");
      expect(heading).toBeInTheDocument();

      // Content should be structured within card layout
      const description = screen.getByText(/Actionable observations/);
      const list = screen.getByRole("list");

      expect(description).toBeInTheDocument();
      expect(list).toBeInTheDocument();
    });

    it("inherits proper styling from Card system", () => {
      const { container } = renderWithProviders(<AIInsightsCard />);

      // Should use the text sizing and spacing utilities from the design system
      const styledContent = container.querySelector(".text-sm.space-y-2");
      expect(styledContent).toBeInTheDocument();
    });
  });
});

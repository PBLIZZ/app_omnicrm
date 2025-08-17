import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatWidget } from "../ChatWidget";

/**
 * Stable component-level tests:
 * - opens the widget and asserts the entrance class is present
 * - toggles close and shows the launcher again
 */

describe("ChatWidget", () => {
  it("opens and applies entrance class", () => {
    render(<ChatWidget />);

    // Open the widget
    const openBtn = screen.getByRole("button", { name: /open chat assistant/i });
    fireEvent.click(openBtn);

    // Title should appear
    expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument();

    // The container card should have the entrance class
    const card = screen.getByText(/AI Assistant/i).closest(".chat-interface-enter");
    expect(card).not.toBeNull();
  });

  it("closes and shows launcher again", () => {
    render(<ChatWidget />);

    fireEvent.click(screen.getByRole("button", { name: /open chat assistant/i }));
    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    // Launcher should be visible again
    expect(screen.getByRole("button", { name: /open chat assistant/i })).toBeInTheDocument();
  });
});

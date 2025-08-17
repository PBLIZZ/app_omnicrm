import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatWidget } from "@/components/chat/ChatWidget";

function mockFetchOkOnce(body: unknown) {
  const response = {
    ok: true,
    status: 200,
    json: async () => body,
  };
  // Minimal typing to satisfy TS without using 'any'
  const fetchMock: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  }> = () => Promise.resolve(response);
  vi.stubGlobal("fetch", vi.fn(fetchMock));
}

describe("ChatWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // ensure cookie access does not throw
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens when clicking the toggle and applies entrance class", () => {
    render(<ChatWidget />);

    const openBtn = screen.getByRole("button", { name: /open chat assistant/i });
    fireEvent.click(openBtn);

    // Title should appear
    expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument();

    // The container card should have the entrance class
    const card = screen.getByText(/AI Assistant/i).closest(".chat-interface-enter");
    expect(card).not.toBeNull();
  });

  it.skip("sends a message and renders assistant reply", async () => {
    mockFetchOkOnce({ text: "Hello from test" });
    render(<ChatWidget />);

    fireEvent.click(screen.getByRole("button", { name: /open chat assistant/i }));

    const input = screen.getByRole("textbox", { name: /type a message/i });
    fireEvent.change(input, { target: { value: "Hi" } });

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    // user message should render
    await waitFor(() => expect(screen.getByText("Hi")).toBeInTheDocument());
    // assistant message should render from mocked response
    await waitFor(() => expect(screen.getByText("Hello from test")).toBeInTheDocument());
  });
});

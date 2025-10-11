import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatAssistant } from "../ChatAssistant";
import { useRAG } from "@/contexts/RAGContext";
import React from "react";

// Mock the RAG context
vi.mock("@/contexts/RAGContext", () => ({
  useRAG: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("ChatAssistant", () => {
  const mockSendMessage = vi.fn();
  const mockClearHistory = vi.fn();
  const mockRegenerateResponse = vi.fn();

  const defaultRAGContext = {
    messages: [],
    isLoading: false,
    sendMessage: mockSendMessage,
    clearHistory: mockClearHistory,
    regenerateResponse: mockRegenerateResponse,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRAG).mockReturnValue(defaultRAGContext);
  });

  it("should render chat assistant UI", () => {
    render(<ChatAssistant />);

    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("should display messages from context", () => {
    vi.mocked(useRAG).mockReturnValue({
      ...defaultRAGContext,
      messages: [
        { id: "1", role: "user", content: "Hello", timestamp: new Date() },
        { id: "2", role: "assistant", content: "Hi there!", timestamp: new Date() },
      ],
    });

    render(<ChatAssistant />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there!")).toBeInTheDocument();
  });

  it("should send message when form is submitted", async () => {
    render(<ChatAssistant />);

    const input = screen.getByRole("textbox");
    const form = input.closest("form");

    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith("Test message");
    });

    // Input should be cleared
    expect(input).toHaveValue("");
  });

  it("should send message on Enter key press", async () => {
    render(<ChatAssistant />);

    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith("Test message");
    });
  });

  it("should not send empty messages", async () => {
    render(<ChatAssistant />);

    const input = screen.getByRole("textbox");
    const form = input.closest("form");

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  it("should clear chat history when clear button is clicked", () => {
    render(<ChatAssistant />);

    const clearButton = screen.getByTitle("Clear chat history");
    fireEvent.click(clearButton);

    expect(mockClearHistory).toHaveBeenCalled();
  });

  it("should apply custom className", () => {
    const { container } = render(<ChatAssistant className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
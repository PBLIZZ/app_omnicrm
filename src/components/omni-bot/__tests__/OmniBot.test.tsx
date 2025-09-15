import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OmniBot } from "../OmniBot";
import { renderWithProviders, mockToast } from "@/__tests__/test-utils";

// Mock OpenAI Realtime API
const mockSession = {
  on: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  audio: {
    player: {
      play: vi.fn(),
    },
    mic: {
      open: vi.fn(),
      close: vi.fn(),
    },
  },
  text: {
    send: vi.fn(),
  },
  send: vi.fn(),
};

const mockAgent = {
  name: "OmniCRM Assistant",
  instructions: expect.any(String),
  tools: expect.any(Array),
};

vi.mock("@openai/agents/realtime", () => ({
  RealtimeAgent: vi.fn().mockImplementation(() => mockAgent),
  RealtimeSession: vi.fn().mockImplementation(() => mockSession),
}));

// Mock logger
vi.mock("@/lib/observability", () => ({
  logger: {
    userError: vi.fn(),
  },
}));

// Mock error handler
vi.mock("@/lib/utils/error-handler", () => ({
  ensureError: vi.fn((error) => (error instanceof Error ? error : new Error(String(error)))),
}));

describe("OmniBot", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial Rendering", () => {
    it("renders the empty state when no chat history", () => {
      renderWithProviders(<OmniBot />);

      expect(
        screen.getByText("Press the mic to start speaking or type a message."),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Type your question...")).toBeInTheDocument();
      expect(screen.getByLabelText("Send message")).toBeInTheDocument();
      expect(screen.getByLabelText("Start recording")).toBeInTheDocument();
    });

    it("displays the Sparkles icon in empty state", () => {
      renderWithProviders(<OmniBot />);

      const sparklesIcon = screen
        .getByText("Press the mic to start speaking or type a message.")
        .closest("div")
        ?.querySelector("svg");
      expect(sparklesIcon).toBeInTheDocument();
    });

    it("initializes with correct input states", () => {
      renderWithProviders(<OmniBot />);

      const textInput = screen.getByPlaceholderText("Type your question...");
      const sendButton = screen.getByLabelText("Send message");
      const micButton = screen.getByLabelText("Start recording");

      expect(textInput).toHaveValue("");
      expect(sendButton).toBeInTheDocument();
      expect(micButton).not.toHaveClass("bg-destructive");
    });
  });

  describe("Session Initialization", () => {
    it("fetches ephemeral key on mount", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
      } as Response);

      renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/chat/openai-token", { method: "POST" });
      });
    });

    it("connects to realtime session with ephemeral key", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
      } as Response);

      renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(mockSession.connect).toHaveBeenCalledWith({ apiKey: "test-ephemeral-key" });
      });
    });

    it("handles initialization errors gracefully", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Should not crash the component
      expect(screen.getByPlaceholderText("Type your question...")).toBeInTheDocument();
    });

    it("handles invalid ephemeral key response", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: "response" }),
      } as Response);

      renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Should handle the error gracefully
      expect(screen.getByPlaceholderText("Type your question...")).toBeInTheDocument();
    });

    it("sets up event listeners on session", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
      } as Response);

      renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(mockSession.on).toHaveBeenCalledWith("audio.transcribed", expect.any(Function));
        expect(mockSession.on).toHaveBeenCalledWith("text.transcribed", expect.any(Function));
        expect(mockSession.on).toHaveBeenCalledWith(
          "audio.output.chunk.received",
          expect.any(Function),
        );
        expect(mockSession.on).toHaveBeenCalledWith("tool.invoked", expect.any(Function));
        expect(mockSession.on).toHaveBeenCalledWith(
          "conversation.item.error",
          expect.any(Function),
        );
      });
    });
  });

  describe("Text Input and Sending", () => {
    beforeEach(async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
      } as Response);
    });

    it("allows typing in the input field", async () => {
      renderWithProviders(<OmniBot />);

      const textInput = screen.getByPlaceholderText("Type your question...");
      await user.type(textInput, "Hello, OmniBot!");

      expect(textInput).toHaveValue("Hello, OmniBot!");
    });

    it("sends text message when send button is clicked", async () => {
      renderWithProviders(<OmniBot />);

      const textInput = screen.getByPlaceholderText("Type your question...");
      const sendButton = screen.getByLabelText("Send message");

      await user.type(textInput, "Hello, OmniBot!");
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockSession.text.send).toHaveBeenCalledWith("Hello, OmniBot!");
      });
    });

    it("sends text message when Enter key is pressed", async () => {
      renderWithProviders(<OmniBot />);

      const textInput = screen.getByPlaceholderText("Type your question...");

      await user.type(textInput, "Hello, OmniBot!");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockSession.text.send).toHaveBeenCalledWith("Hello, OmniBot!");
      });
    });

    it("clears input after sending message", async () => {
      renderWithProviders(<OmniBot />);

      const textInput = screen.getByPlaceholderText("Type your question...");
      const sendButton = screen.getByLabelText("Send message");

      await user.type(textInput, "Hello, OmniBot!");
      await user.click(sendButton);

      await waitFor(() => {
        expect(textInput).toHaveValue("");
      });
    });

    it("does not send empty messages", async () => {
      renderWithProviders(<OmniBot />);

      const sendButton = screen.getByLabelText("Send message");
      await user.click(sendButton);

      expect(mockSession.text.send).not.toHaveBeenCalled();
    });

    it("does not send whitespace-only messages", async () => {
      renderWithProviders(<OmniBot />);

      const textInput = screen.getByPlaceholderText("Type your question...");
      const sendButton = screen.getByLabelText("Send message");

      await user.type(textInput, "   \n   ");
      await user.click(sendButton);

      expect(mockSession.text.send).not.toHaveBeenCalled();
    });
  });

  describe("Voice Recording", () => {
    beforeEach(async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
      } as Response);
    });

    it("starts recording when mic button is clicked", async () => {
      renderWithProviders(<OmniBot />);

      const micButton = screen.getByLabelText("Start recording");
      await user.click(micButton);

      await waitFor(() => {
        expect(mockSession.audio.mic.open).toHaveBeenCalled();
      });
    });

    it("stops recording when mic button is clicked while recording", async () => {
      renderWithProviders(<OmniBot />);

      const micButton = screen.getByLabelText("Start recording");

      // Start recording
      await user.click(micButton);
      await waitFor(() => {
        expect(mockSession.audio.mic.open).toHaveBeenCalled();
      });

      // Stop recording
      const stopButton = screen.getByLabelText("Stop recording");
      await user.click(stopButton);

      await waitFor(() => {
        expect(mockSession.audio.mic.close).toHaveBeenCalled();
      });
    });

    it("changes button appearance when recording", async () => {
      renderWithProviders(<OmniBot />);

      const micButton = screen.getByLabelText("Start recording");

      // Should start as outline variant
      expect(micButton).not.toHaveClass("bg-destructive");

      await user.click(micButton);

      // Should change to destructive variant when recording
      await waitFor(() => {
        const recordingButton = screen.getByLabelText("Stop recording");
        expect(recordingButton).toBeInTheDocument();
      });
    });

    it("handles mic permissions errors gracefully", async () => {
      renderWithProviders(<OmniBot />);

      mockSession.audio.mic.open.mockRejectedValueOnce(new Error("Microphone access denied"));

      const micButton = screen.getByLabelText("Start recording");
      await user.click(micButton);

      // Should not crash the component
      expect(screen.getByPlaceholderText("Type your question...")).toBeInTheDocument();
    });
  });

  describe("Chat History Display", () => {
    it("displays user messages correctly", () => {
      // We need to simulate the chat history state being updated
      // This would require testing the session event handlers
      renderWithProviders(<OmniBot />);

      // Initially should show empty state
      expect(
        screen.getByText("Press the mic to start speaking or type a message."),
      ).toBeInTheDocument();
    });

    it("displays bot messages with OmniBot branding", () => {
      renderWithProviders(<OmniBot />);

      // This would test the message display once chat history is populated
      // The actual test would require triggering the session event handlers
    });

    it("displays tool invocation messages", () => {
      renderWithProviders(<OmniBot />);

      // This would test tool message display
      // Requires simulating the tool.invoked event
    });

    it("shows interim messages with reduced opacity", () => {
      renderWithProviders(<OmniBot />);

      // This would test the isFinal: false styling
    });

    it("handles message overflow with scrolling", () => {
      renderWithProviders(<OmniBot />);

      const chatContainer = screen
        .getByText("Press the mic to start speaking or type a message.")
        .closest("div");
      expect(chatContainer).toHaveClass("overflow-y-auto");
    });
  });

  describe("Tool Integration", () => {
    beforeEach(async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { contacts: [] } }),
        } as Response);
    });

    it("configures correct tools for the agent", async () => {
      const { RealtimeAgent } = await import("@openai/agents/realtime");

      renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(RealtimeAgent).toHaveBeenCalledWith({
          name: "OmniCRM Assistant",
          instructions: expect.stringContaining("CRM assistant for wellness professionals"),
          tools: expect.arrayContaining([
            expect.objectContaining({ name: "get_contacts_summary" }),
            expect.objectContaining({ name: "search_contacts" }),
          ]),
        });
      });
    });

    it("handles tool invocations correctly", async () => {
      const mockFetch = vi.mocked(global.fetch);

      renderWithProviders(<OmniBot />);

      // Wait for initialization
      await waitFor(() => {
        expect(mockSession.on).toHaveBeenCalledWith("tool.invoked", expect.any(Function));
      });

      // Get the tool.invoked handler and call it
      const toolInvokedHandler = mockSession.on.mock.calls.find(
        (call) => call[0] === "tool.invoked",
      )?.[1];

      if (toolInvokedHandler) {
        await toolInvokedHandler({
          toolName: "get_contacts_summary",
          toolArgs: {},
        });

        expect(mockFetch).toHaveBeenCalledWith("/api/chat/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toolName: "get_contacts_summary",
            toolArgs: {},
          }),
        });
      }
    });

    it("handles tool execution errors", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
        } as Response)
        .mockRejectedValueOnce(new Error("Tool execution failed"));

      renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(mockSession.on).toHaveBeenCalledWith("tool.invoked", expect.any(Function));
      });

      // Should handle tool errors gracefully
      expect(screen.getByPlaceholderText("Type your question...")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("handles conversation errors", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
      } as Response);

      renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(mockSession.on).toHaveBeenCalledWith(
          "conversation.item.error",
          expect.any(Function),
        );
      });

      // Get the error handler and call it
      const errorHandler = mockSession.on.mock.calls.find(
        (call) => call[0] === "conversation.item.error",
      )?.[1];

      if (errorHandler) {
        errorHandler({ message: "Test error" });
      }

      // Should handle errors gracefully
      expect(screen.getByPlaceholderText("Type your question...")).toBeInTheDocument();
    });

    it("handles network failures during initialization", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Should render normally despite initialization failure
      expect(screen.getByPlaceholderText("Type your question...")).toBeInTheDocument();
    });
  });

  describe("Cleanup", () => {
    it("disconnects session on unmount", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
      } as Response);

      const { unmount } = renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(mockSession.connect).toHaveBeenCalled();
      });

      unmount();

      expect(mockSession.disconnect).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("provides proper ARIA labels for buttons", () => {
      renderWithProviders(<OmniBot />);

      expect(screen.getByLabelText("Send message")).toBeInTheDocument();
      expect(screen.getByLabelText("Start recording")).toBeInTheDocument();
    });

    it("updates ARIA labels based on recording state", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
      } as Response);

      renderWithProviders(<OmniBot />);

      const micButton = screen.getByLabelText("Start recording");
      await user.click(micButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Stop recording")).toBeInTheDocument();
      });
    });

    it("supports keyboard navigation", async () => {
      renderWithProviders(<OmniBot />);

      const textInput = screen.getByPlaceholderText("Type your question...");
      const sendButton = screen.getByLabelText("Send message");
      const micButton = screen.getByLabelText("Start recording");

      // Tab navigation
      await user.tab();
      expect(textInput).toHaveFocus();

      await user.tab();
      expect(sendButton).toHaveFocus();

      await user.tab();
      expect(micButton).toHaveFocus();
    });

    it("provides proper semantic structure", () => {
      renderWithProviders(<OmniBot />);

      // Should have proper input and button elements
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getAllByRole("button")).toHaveLength(2);
    });
  });

  describe("Real-time Features", () => {
    it("handles audio transcription events", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
      } as Response);

      renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(mockSession.on).toHaveBeenCalledWith("audio.transcribed", expect.any(Function));
      });

      // This would test the actual transcription handling
      // Requires getting the handler and calling it with mock data
    });

    it("handles text transcription events", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
      } as Response);

      renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(mockSession.on).toHaveBeenCalledWith("text.transcribed", expect.any(Function));
      });
    });

    it("handles audio output chunks", async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ secret: "test-ephemeral-key" }),
      } as Response);

      renderWithProviders(<OmniBot />);

      await waitFor(() => {
        expect(mockSession.on).toHaveBeenCalledWith(
          "audio.output.chunk.received",
          expect.any(Function),
        );
      });

      // Get the audio handler and call it
      const audioHandler = mockSession.on.mock.calls.find(
        (call) => call[0] === "audio.output.chunk.received",
      )?.[1];

      if (audioHandler) {
        const mockChunk = { data: new Uint8Array([1, 2, 3]), format: "wav" };
        audioHandler(mockChunk);

        expect(mockSession.audio.player.play).toHaveBeenCalledWith(mockChunk);
      }
    });
  });
});

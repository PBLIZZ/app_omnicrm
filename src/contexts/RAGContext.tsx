// ===== RAG CHAT ASSISTANT IMPLEMENTATION =====
// Integrates with the same embeddings used for global search

// ===== 1. RAG CONTEXT & PROVIDER (app/contexts/RAGContext.tsx) =====
"use client";
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  sources?: DocumentSource[];
}

interface DocumentSource {
  id: string;
  type: string;
  title: string;
  content: string;
  similarity: number;
  url: string;
}

interface RAGContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
  regenerateResponse: (messageId: string) => Promise<void>;
}

const RAGContext = createContext<RAGContextType | null>(null);

export function RAGProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your wellness practice AI assistant. I can help you find information about your clients, appointments, tasks, and provide insights about your practice. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup effect to abort any pending requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      // Add user message immediately
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Get current messages for context
        const currentMessages = [...messages, userMessage];
        const history = currentMessages.slice(-10);

        // Send the request with the current history
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            history: history,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) throw new Error("Chat request failed");
        const data = await response.json();

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          sources: data.sources || [],
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        // Handle AbortError specifically
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Chat request was cancelled");
          return; // Don't show error message for cancelled requests
        }

        console.error("Chat error:", error);
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        // Clear the abort controller reference
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [messages],
  );

  const clearHistory = useCallback(() => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "History cleared. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const regenerateResponse = useCallback(
    async (messageId: string) => {
      setMessages((prev) => {
        const messageIndex = prev.findIndex((m) => m.id === messageId);
        if (messageIndex === -1) return prev;

        const userMessage = prev[messageIndex - 1];
        if (!userMessage || userMessage.role !== "user") return prev;

        // Remove the message we're regenerating and all messages after it
        const updatedMessages = prev.slice(0, messageIndex);

        // Resend the user message asynchronously
        sendMessage(userMessage.content);

        return updatedMessages;
      });
    },
    [sendMessage],
  );

  return (
    <RAGContext.Provider
      value={{
        messages,
        isLoading,
        sendMessage,
        clearHistory,
        regenerateResponse,
      }}
    >
      {children}
    </RAGContext.Provider>
  );
}

export const useRAG = () => {
  const context = useContext(RAGContext);
  if (!context) throw new Error("useRAG must be used within RAGProvider");
  return context;
};

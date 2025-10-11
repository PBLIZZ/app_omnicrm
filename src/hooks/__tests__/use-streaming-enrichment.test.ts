import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStreamingEnrichment } from "../use-streaming-enrichment";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock fetch globally
global.fetch = vi.fn();

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useStreamingEnrichment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.cookie for CSRF
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "csrf=test-csrf-token",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.currentContact).toBeNull();
    expect(result.current.enrichedCount).toBe(0);
    expect(result.current.totalContacts).toBe(0);
    expect(result.current.errors).toEqual([]);
  });

  it("should start enrichment with streaming", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        // Simulate SSE messages
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"start","total":5}\n\n'),
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"progress","enrichedCount":1,"contactName":"John Doe"}\n\n',
          ),
        );
        controller.close();
      },
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    result.current.startEnrichment();

    await waitFor(() => {
      expect(result.current.isRunning).toBe(true);
    });

    expect(fetch).toHaveBeenCalledWith("/api/contacts/enrich?stream=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": "test-csrf-token",
      },
      credentials: "same-origin",
    });
  });

  it("should handle start event and update total contacts", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"start","total":10}\n\n'),
        );
        controller.close();
      },
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    result.current.startEnrichment();

    await waitFor(() => {
      expect(result.current.totalContacts).toBe(10);
      expect(result.current.totalClients).toBe(10);
    });
  });

  it("should handle progress events and update current contact", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"start","total":5}\n\n'),
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"progress","enrichedCount":2,"total":5,"contactName":"Jane Smith"}\n\n',
          ),
        );
        controller.close();
      },
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    result.current.startEnrichment();

    await waitFor(() => {
      expect(result.current.currentContact).toBe("Jane Smith");
      expect(result.current.currentClient).toBe("Jane Smith");
      expect(result.current.progress).toBe(40); // 2/5 = 40%
    });
  });

  it("should handle enriched events and update cache", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"start","total":3}\n\n'),
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"enriched","contactId":"contact-1","enrichedCount":1,"stage":"New Client","tags":["VIP"],"confidenceScore":0.9}\n\n',
          ),
        );
        controller.close();
      },
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    result.current.startEnrichment();

    await waitFor(() => {
      expect(result.current.enrichedCount).toBe(1);
    });
  });

  it("should handle error events and collect errors", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"start","total":3}\n\n'),
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"error","error":"Failed to enrich contact"}\n\n',
          ),
        );
        controller.close();
      },
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    result.current.startEnrichment();

    await waitFor(() => {
      expect(result.current.errors).toContain("Failed to enrich contact");
    });
  });

  it("should handle complete event and show success toast", async () => {
    const { toast } = await import("sonner");

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"start","total":5}\n\n'),
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"complete","enrichedCount":5,"errors":[]}\n\n',
          ),
        );
        controller.close();
      },
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    result.current.startEnrichment();

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
      expect(result.current.progress).toBe(100);
    });

    expect(toast.success).toHaveBeenCalledWith("Enrichment Complete", {
      description: "Enriched 5 contacts with AI insights",
    });
  });

  it("should handle HTTP errors gracefully", async () => {
    const { toast } = await import("sonner");

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    } as Response);

    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    result.current.startEnrichment();

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });

    expect(toast.error).toHaveBeenCalledWith("Enrichment Failed", {
      description: "Server error",
    });
  });

  it("should handle network errors", async () => {
    const { toast } = await import("sonner");

    vi.mocked(fetch).mockRejectedValue(new Error("Network timeout"));

    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    result.current.startEnrichment();

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });

    expect(toast.error).toHaveBeenCalledWith("Enrichment Failed", {
      description: "Network timeout",
    });
  });

  it("should handle malformed SSE data gracefully", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: {invalid json\n\n"));
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"start","total":5}\n\n'),
        );
        controller.close();
      },
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    result.current.startEnrichment();

    await waitFor(() => {
      expect(result.current.totalContacts).toBe(5);
    });

    // Should continue processing valid messages despite invalid one
    expect(result.current.isRunning).toBe(true);
  });

  it("should skip unknown event types", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"unknown","data":"something"}\n\n'),
        );
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"start","total":5}\n\n'),
        );
        controller.close();
      },
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    result.current.startEnrichment();

    await waitFor(() => {
      expect(result.current.totalContacts).toBe(5);
    });
  });

  it("should handle missing CSRF token", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: new ReadableStream(),
    } as Response);

    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    result.current.startEnrichment();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/contacts/enrich?stream=true",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-csrf-token": "",
          }),
        }),
      );
    });
  });

  it("should calculate progress percentage correctly", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"start","total":10}\n\n'),
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"progress","enrichedCount":3,"total":10}\n\n',
          ),
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"progress","enrichedCount":7,"total":10}\n\n',
          ),
        );
        controller.close();
      },
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: mockStream,
    } as Response);

    const { result } = renderHook(() => useStreamingEnrichment(), {
      wrapper: createWrapper(),
    });

    result.current.startEnrichment();

    await waitFor(() => {
      expect(result.current.progress).toBe(70); // 7/10 = 70%
    });
  });
});
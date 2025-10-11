import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useStreamingEnrichment } from "../use-streaming-enrichment";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock fetch for SSE streaming
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create SSE stream
function createMockSSEStream(events: any[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const event of events) {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }
      controller.close();
    },
  });

  return {
    ok: true,
    body: stream,
    json: async () => ({}),
  };
}

describe("useStreamingEnrichment", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock CSRF token
    global.document.cookie = "csrf-token=test-token";
  });

  afterEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useStreamingEnrichment(), { wrapper });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.currentContact).toBeNull();
    expect(result.current.enrichedCount).toBe(0);
    expect(result.current.totalContacts).toBe(0);
    expect(result.current.errors).toEqual([]);
  });

  it("should process streaming enrichment events", async () => {
    const mockEvents = [
      { type: "start", total: 3 },
      {
        type: "enriched",
        contactId: "contact-1",
        contactName: "John Doe",
        lifecycleStage: "New Client",
        tags: ["wellness"],
        confidenceScore: 0.85,
        enrichedCount: 1,
      },
      {
        type: "enriched",
        contactId: "contact-2",
        contactName: "Jane Smith",
        lifecycleStage: "Prospect",
        tags: ["fitness"],
        confidenceScore: 0.75,
        enrichedCount: 2,
      },
      { type: "complete", enrichedCount: 2, total: 3 },
    ];

    mockFetch.mockResolvedValue(createMockSSEStream(mockEvents));

    const { result } = renderHook(() => useStreamingEnrichment(), { wrapper });

    act(() => {
      result.current.startEnrichment();
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(true);
    });

    await waitFor(
      () => {
        expect(result.current.enrichedCount).toBe(2);
      },
      { timeout: 3000 },
    );

    expect(result.current.totalContacts).toBe(3);
    expect(result.current.isRunning).toBe(false);
  });

  it("should update progress during enrichment", async () => {
    const mockEvents = [
      { type: "start", total: 2 },
      { type: "enriched", contactId: "contact-1", contactName: "Test", enrichedCount: 1 },
      { type: "complete", enrichedCount: 1, total: 2 },
    ];

    mockFetch.mockResolvedValue(createMockSSEStream(mockEvents));

    const { result } = renderHook(() => useStreamingEnrichment(), { wrapper });

    act(() => {
      result.current.startEnrichment();
    });

    await waitFor(() => {
      expect(result.current.progress).toBeGreaterThan(0);
    });
  });

  it("should handle enrichment errors", async () => {
    const mockEvents = [
      { type: "start", total: 2 },
      { type: "error", contactId: "contact-1", error: "Enrichment failed" },
      { type: "complete", enrichedCount: 0, total: 2, errors: ["Enrichment failed"] },
    ];

    mockFetch.mockResolvedValue(createMockSSEStream(mockEvents));

    const { result } = renderHook(() => useStreamingEnrichment(), { wrapper });

    act(() => {
      result.current.startEnrichment();
    });

    await waitFor(() => {
      expect(result.current.errors.length).toBeGreaterThan(0);
    });

    expect(result.current.errors).toContain("Enrichment failed");
  });

  it("should handle HTTP errors", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    const { result } = renderHook(() => useStreamingEnrichment(), { wrapper });

    await act(async () => {
      await expect(result.current.startEnrichment()).rejects.toThrow();
    });
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useStreamingEnrichment(), { wrapper });

    await act(async () => {
      await expect(result.current.startEnrichment()).rejects.toThrow("Network error");
    });
  });

  it("should set currentContact during enrichment", async () => {
    const mockEvents = [
      { type: "start", total: 1 },
      {
        type: "enriched",
        contactId: "contact-1",
        contactName: "John Doe",
        enrichedCount: 1,
      },
      { type: "complete", enrichedCount: 1, total: 1 },
    ];

    mockFetch.mockResolvedValue(createMockSSEStream(mockEvents));

    const { result } = renderHook(() => useStreamingEnrichment(), { wrapper });

    act(() => {
      result.current.startEnrichment();
    });

    await waitFor(() => {
      expect(result.current.currentContact).toBe("John Doe");
    });
  });

  it("should invalidate contacts query on completion", async () => {
    const mockEvents = [
      { type: "start", total: 1 },
      { type: "enriched", contactId: "contact-1", enrichedCount: 1 },
      { type: "complete", enrichedCount: 1, total: 1 },
    ];

    mockFetch.mockResolvedValue(createMockSSEStream(mockEvents));

    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useStreamingEnrichment(), { wrapper });

    act(() => {
      result.current.startEnrichment();
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalled();
  });

  it("should handle empty enrichment (no contacts)", async () => {
    const mockEvents = [
      { type: "start", total: 0 },
      { type: "complete", enrichedCount: 0, total: 0 },
    ];

    mockFetch.mockResolvedValue(createMockSSEStream(mockEvents));

    const { result } = renderHook(() => useStreamingEnrichment(), { wrapper });

    act(() => {
      result.current.startEnrichment();
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });

    expect(result.current.enrichedCount).toBe(0);
    expect(result.current.totalContacts).toBe(0);
  });

  it("should include CSRF token in request", async () => {
    const mockEvents = [
      { type: "start", total: 0 },
      { type: "complete", enrichedCount: 0, total: 0 },
    ];

    mockFetch.mockResolvedValue(createMockSSEStream(mockEvents));

    const { result } = renderHook(() => useStreamingEnrichment(), { wrapper });

    act(() => {
      result.current.startEnrichment();
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/contacts/enrich?stream=true",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-csrf-token": expect.any(String),
        }),
      }),
    );
  });

  it("should handle progress events with contact details", async () => {
    const mockEvents = [
      { type: "start", total: 1 },
      {
        type: "progress",
        contactId: "contact-1",
        contactName: "Processing...",
      },
      {
        type: "enriched",
        contactId: "contact-1",
        contactName: "John Doe",
        lifecycleStage: "New Client",
        tags: ["wellness"],
        confidenceScore: 0.9,
        enrichedCount: 1,
      },
      { type: "complete", enrichedCount: 1, total: 1 },
    ];

    mockFetch.mockResolvedValue(createMockSSEStream(mockEvents));

    const { result } = renderHook(() => useStreamingEnrichment(), { wrapper });

    act(() => {
      result.current.startEnrichment();
    });

    await waitFor(() => {
      expect(result.current.enrichedCount).toBe(1);
    });
  });
});
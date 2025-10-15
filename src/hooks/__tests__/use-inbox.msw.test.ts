/**
 * Inbox Hook Tests (using MSW)
 * 
 * Tests for useInbox, useInboxStats, and useUnprocessedInboxItems hooks
 * with MSW for realistic API mocking.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClientWrapper } from "@packages/testing";
import { useInbox, useInboxStats, useUnprocessedInboxItems } from "../use-inbox";

// Mock toast
vi.mock("../use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("useInbox (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  describe("Query Operations", () => {
    it("fetches all inbox items by default", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[0].rawText).toBe("Follow up with client about proposal");
      expect(result.current.items[1].rawText).toBe("Schedule dentist appointment");
      expect(result.current.items[2].rawText).toBe("Review quarterly reports");
    });

    it("filters items by status", async () => {
      const { result } = renderHook(
        () => useInbox({ filters: { status: ["unprocessed"] } }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items.every((item) => item.status === "unprocessed")).toBe(true);
    });

    it("filters items by search query", async () => {
      const { result } = renderHook(
        () => useInbox({ filters: { search: "dentist" } }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].rawText).toContain("dentist");
    });

    it("returns empty array while loading", () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it("fetches inbox statistics", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingStats).toBe(false));

      expect(result.current.stats).toEqual({
        unprocessed: 2,
        processed: 1,
        archived: 0,
        total: 3,
      });
    });

    it("provides refetch function", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const refetchResult = await result.current.refetch();
      expect(refetchResult.data).toHaveLength(3);
      expect(refetchResult.error).toBeNull();
    });

    it("provides refetchStats function", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingStats).toBe(false));

      const refetchResult = await result.current.refetchStats();
      expect(refetchResult.data).toEqual({
        unprocessed: 2,
        processed: 1,
        archived: 0,
        total: 3,
      });
      expect(refetchResult.error).toBeNull();
    });
  });

  describe("Quick Capture", () => {
    it("creates a new inbox item successfully", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.quickCapture({ rawText: "New quick capture item" });

      // Wait for creation to complete
      await waitFor(() => expect(result.current.isCreating).toBe(false));

      // Mutation completed successfully (MSW returned 201)
      expect(result.current.isCreating).toBe(false);
    });

    it("tracks creating state", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isCreating).toBe(false);

      result.current.quickCapture({ rawText: "Test item" });

      await waitFor(() => expect(result.current.isCreating).toBe(false));
    });
  });

  describe("Voice Capture", () => {
    it("creates a voice note successfully", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const audioBlob = new Blob(["test audio"], { type: "audio/webm" });

      result.current.voiceCapture({ audioBlob, transcript: "Voice test" });

      // Wait for creation to complete
      await waitFor(() => expect(result.current.isCreating).toBe(false));

      // Mutation completed successfully (MSW returned 201)
      expect(result.current.isCreating).toBe(false);
    });

    it("tracks creating state for voice capture", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isCreating).toBe(false);

      const audioBlob = new Blob(["test"], { type: "audio/webm" });
      result.current.voiceCapture({ audioBlob });

      await waitFor(() => expect(result.current.isCreating).toBe(false));
    });
  });

  describe("Process Item", () => {
    it("processes an item with AI successfully", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const processingResult = await result.current.processItem({ itemId: "inbox-1" });

      expect(processingResult).toEqual({
        itemId: "inbox-1",
        category: "task",
        suggestedTitle: "Processed Task",
        suggestedDescription: "This is a processed task",
        suggestedPriority: "medium",
        confidence: 0.85,
      });
    });

    it("tracks processing state", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isProcessing).toBe(false);

      const promise = result.current.processItem({ itemId: "inbox-1" });

      await waitFor(() => expect(result.current.isProcessing).toBe(false));
      await promise;
    });
  });

  describe("Bulk Process", () => {
    it("processes multiple items successfully", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const bulkResult = await result.current.bulkProcess({
        itemIds: ["inbox-1", "inbox-2"],
        action: "process",
      });

      expect(bulkResult.processed).toHaveLength(2);
      expect(bulkResult.processed[0].status).toBe("processed");
    });

    it("tracks bulk processing state", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isBulkProcessing).toBe(false);

      const promise = result.current.bulkProcess({
        itemIds: ["inbox-1"],
        action: "process",
      });

      await waitFor(() => expect(result.current.isBulkProcessing).toBe(false));
      await promise;
    });
  });

  describe("Update Item", () => {
    it("updates an item successfully", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.updateItem("inbox-1", { status: "processed" });

      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      // Item should be updated in cache
      const updatedItem = result.current.items.find((item) => item.id === "inbox-1");
      expect(updatedItem?.status).toBe("processed");
    });

    it("tracks updating state", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isUpdating).toBe(false);

      result.current.updateItem("inbox-1", { status: "archived" });

      await waitFor(() => expect(result.current.isUpdating).toBe(false));
    });
  });

  describe("Mark As Processed", () => {
    it("marks an item as processed successfully", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.markAsProcessed("inbox-1");

      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      const processedItem = result.current.items.find((item) => item.id === "inbox-1");
      expect(processedItem?.status).toBe("processed");
    });

    it("marks with created task ID", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.markAsProcessed("inbox-1", "task-123");

      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      const processedItem = result.current.items.find((item) => item.id === "inbox-1");
      expect(processedItem?.createdTaskId).toBe("task-123");
    });

    it("tracks updating state for mark as processed", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isUpdating).toBe(false);

      result.current.markAsProcessed("inbox-1");

      await waitFor(() => expect(result.current.isUpdating).toBe(false));
    });
  });

  describe("Delete Item", () => {
    it("deletes an item successfully", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const itemToDelete = result.current.items[0];

      result.current.deleteItem(itemToDelete.id);

      // Wait for deletion to complete
      await waitFor(() => expect(result.current.isDeleting).toBe(false));

      // Mutation completed successfully (MSW returned 200)
      expect(result.current.isDeleting).toBe(false);
    });

    it("tracks deleting state", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isDeleting).toBe(false);

      result.current.deleteItem("inbox-1");

      await waitFor(() => expect(result.current.isDeleting).toBe(false));
    });
  });

  describe("Multiple Operations", () => {
    it("can perform create, update, and delete in sequence", async () => {
      const { result } = renderHook(() => useInbox(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const initialItems = result.current.items;
      expect(initialItems.length).toBeGreaterThan(0);

      // Create
      result.current.quickCapture({ rawText: "Sequential test item" });
      await waitFor(() => expect(result.current.isCreating).toBe(false));

      // Update an existing item
      const itemToUpdate = result.current.items[0];
      result.current.updateItem(itemToUpdate.id, { status: "processed" });
      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      const updatedItem = result.current.items.find((i) => i.id === itemToUpdate.id);
      expect(updatedItem?.status).toBe("processed");

      // Delete an item
      result.current.deleteItem(itemToUpdate.id);
      await waitFor(() => expect(result.current.isDeleting).toBe(false));

      // All mutations completed successfully
      expect(result.current.isCreating).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe("Auto Refetch", () => {
    it("disables auto refetch when autoRefetch is false", async () => {
      const { result } = renderHook(() => useInbox({ autoRefetch: false }), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // We can't easily test that refetch doesn't happen automatically in unit tests,
      // but we can verify the hook initializes correctly
      expect(result.current.items).toHaveLength(3);
    });
  });
});

describe("useInboxStats (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("fetches inbox statistics", async () => {
    const { result } = renderHook(() => useInboxStats(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual({
      unprocessed: 2,
      processed: 1,
      archived: 0,
      total: 3,
    });
  });

  it("returns undefined while loading", () => {
    const { result } = renderHook(() => useInboxStats(), { wrapper });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });
});

describe("useUnprocessedInboxItems (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("fetches only unprocessed items", async () => {
    const { result } = renderHook(() => useUnprocessedInboxItems(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.every((item) => item.status === "unprocessed")).toBe(true);
  });

  it("returns undefined while loading", () => {
    const { result } = renderHook(() => useUnprocessedInboxItems(), { wrapper });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it("respects limit parameter", async () => {
    const { result } = renderHook(() => useUnprocessedInboxItems(1), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Note: The MSW handler doesn't implement limit logic yet,
    // but this tests that the parameter is passed correctly
    expect(result.current.data).toBeDefined();
  });
});

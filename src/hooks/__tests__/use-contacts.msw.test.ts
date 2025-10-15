/**
 * Contact Hooks Tests (using MSW)
 *
 * These tests use Mock Service Worker to intercept HTTP requests,
 * providing a realistic testing environment without brittle module mocks.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClientWrapper } from "@packages/testing";
import { server } from "../../../test/msw/server";
import { http, HttpResponse } from "msw";
import {
  useContacts,
  useContactSuggestions,
  useCreateContact,
  useDeleteContact,
} from "../use-contacts";

describe("useContacts (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("fetches contacts without search query", async () => {
    const { result } = renderHook(() => useContacts("", 1, 25), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.items[0].displayName).toBe("John Doe");
    expect(result.current.data?.total).toBe(2);
  });

  it("fetches contacts with search query", async () => {
    const { result } = renderHook(() => useContacts("john", 1, 25), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].displayName).toBe("John Doe");
  });

  it("trims search query whitespace", async () => {
    const { result } = renderHook(() => useContacts("  john  ", 1, 25), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].displayName).toBe("John Doe");
  });

  it("handles empty results", async () => {
    const { result } = renderHook(() => useContacts("nonexistent", 1, 25), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(0);
    expect(result.current.data?.total).toBe(0);
  });

  it("handles API errors gracefully", async () => {
    // Override the default handler for this test
    server.use(
      http.get("/api/contacts", () => {
        return HttpResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useContacts("", 1, 25), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

describe("useContactSuggestions (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("fetches suggestions when enabled", async () => {
    const { result } = renderHook(() => useContactSuggestions(true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].displayName).toBe("Alex Johnson");
    expect(result.current.data?.[0].source).toBe("calendar");
  });

  it("does not fetch when disabled", () => {
    const { result } = renderHook(() => useContactSuggestions(false), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });

  it("handles API errors", async () => {
    server.use(
      http.get("/api/contacts/suggestions", () => {
        return HttpResponse.json(
          { error: "Failed to fetch suggestions" },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useContactSuggestions(true), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateContact (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("creates a contact successfully", async () => {
    const { result } = renderHook(() => useCreateContact(), { wrapper });

    result.current.mutate({
      displayName: "New Contact",
      primaryEmail: "new@example.com",
      source: "manual",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.displayName).toBe("New Contact");
    expect(result.current.data?.primaryEmail).toBe("new@example.com");
  });

  it("handles creation errors", async () => {
    server.use(
      http.post("/api/contacts", () => {
        return HttpResponse.json(
          { error: "Validation failed" },
          { status: 400 }
        );
      })
    );

    const { result } = renderHook(() => useCreateContact(), { wrapper });

    result.current.mutate({
      displayName: "Invalid Contact",
      source: "manual",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useDeleteContact (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  it("deletes a contact successfully", async () => {
    const { result } = renderHook(() => useDeleteContact(), { wrapper });

    result.current.mutate("contact-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles deletion of non-existent contact", async () => {
    server.use(
      http.delete("/api/contacts/:id", () => {
        return HttpResponse.json(
          { error: "Contact not found" },
          { status: 404 }
        );
      })
    );

    const { result } = renderHook(() => useDeleteContact(), { wrapper });

    result.current.mutate("nonexistent-id");

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

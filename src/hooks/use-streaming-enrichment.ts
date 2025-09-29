import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queries/keys";
import type { Contact } from "@/server/db/types";

export interface EnrichmentProgress {
  type: "start" | "progress" | "enriched" | "error" | "complete";
  total?: number;
  enrichedCount?: number;
  contactId?: string;
  contactName?: string;
  stage?: string;
  tags?: string[];
  confidenceScore?: number;
  error?: string;
  errors?: string[];
  totalContacts?: number;
}

export interface EnrichmentState {
  isRunning: boolean;
  progress: number;
  currentContact: string | null;
  currentClient: string | null; // Alias for UI compatibility
  enrichedCount: number;
  totalContacts: number;
  totalClients: number; // Alias for UI compatibility
  errors: string[];
}

interface ContactsQueryData {
  items: Contact[];
  total?: number;
  [key: string]: unknown;
}

export function useStreamingEnrichment(): EnrichmentState & {
  startEnrichment: () => Promise<void>;
} {
  const queryClient = useQueryClient();
  const [state, setState] = useState<EnrichmentState>({
    isRunning: false,
    progress: 0,
    currentContact: null,
    currentClient: null, // Alias for UI compatibility
    enrichedCount: 0,
    totalContacts: 0,
    totalClients: 0, // Alias for UI compatibility
    errors: [],
  });

  const startEnrichment = useCallback(async () => {
    setState({
      isRunning: true,
      progress: 0,
      currentContact: null,
      currentClient: null, // Alias for UI compatibility
      enrichedCount: 0,
      totalContacts: 0,
      totalClients: 0, // Alias for UI compatibility
      errors: [],
    });

    try {
      // Note: Using raw fetch here is appropriate for streaming SSE responses
      // The centralized API utilities don't support direct access to response.body.getReader()
      const response = await fetch("/api/contacts/enrich?stream=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrf(),
        },
        credentials: "same-origin",
      });

      if (!response.ok) {
        // Try to get error details from response body
        try {
          const errorData = (await response.json()) as { error: string; code?: string };
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed: unknown = JSON.parse(line.slice(6));
              if (!isEnrichmentProgress(parsed)) {
                // Skip unknown payload shapes
                continue;
              }
              const data: EnrichmentProgress = parsed;

              setState((prev) => {
                switch (data.type) {
                  case "start":
                    return {
                      ...prev,
                      totalContacts: data.total ?? 0,
                      totalClients: data.total ?? 0, // Alias for UI compatibility
                    };

                  case "progress":
                    return {
                      ...prev,
                      currentContact: data.contactName ?? null,
                      currentClient: data.contactName ?? null, // Alias for UI compatibility
                      progress: data.total ? ((data.enrichedCount ?? 0) / data.total) * 100 : 0,
                    };

                  case "enriched":
                    // Update React Query cache with enriched contact data
                    queryClient.setQueryData(
                      ["contacts"],
                      (oldData: ContactsQueryData | undefined) => {
                        if (!oldData?.items) return oldData;

                        return {
                          ...oldData,
                          items: oldData.items.map((contact: Contact) =>
                            contact.id === data.contactId
                              ? {
                                  ...contact,
                                  stage: data.stage,
                                  tags: data.tags,
                                  confidenceScore: data.confidenceScore?.toString(),
                                  updatedAt: new Date(),
                                }
                              : contact,
                          ),
                        };
                      },
                    );

                    return {
                      ...prev,
                      enrichedCount: data.enrichedCount ?? prev.enrichedCount,
                      progress: prev.totalContacts
                        ? ((data.enrichedCount ?? 0) / prev.totalContacts) * 100
                        : 0,
                    };

                  case "error":
                    return {
                      ...prev,
                      errors: [...prev.errors, data.error ?? "Unknown error"],
                    };

                  case "complete":
                    toast.success("Enrichment Complete", {
                      description: `Enriched ${data.enrichedCount} contacts with AI insights`,
                    });

                    if (data.errors?.length) {
                      // Errors will be displayed in UI
                    }

                    // Invalidate queries to refresh data
                    void queryClient.invalidateQueries({ queryKey: queryKeys.clients.list() });

                    return {
                      ...prev,
                      isRunning: false,
                      progress: 100,
                      currentContact: null,
                      enrichedCount: data.enrichedCount ?? prev.enrichedCount,
                      errors: data.errors ?? prev.errors,
                    };

                  default:
                    return prev;
                }
              });
            } catch {
              // Skip malformed SSE data
            }
          }
        }
      }
    } catch (error) {
      toast.error("Enrichment Failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });

      setState((prev) => ({
        ...prev,
        isRunning: false,
      }));
    }
  }, [queryClient]);

  return {
    ...state,
    startEnrichment,
  };
}

// Helper to get CSRF token from cookie (matches pattern from centralized API utilities)
function getCsrf(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1] ?? "") : "";
}

// Type guard for enrichment progress SSE payloads
function isEnrichmentProgress(v: unknown): v is EnrichmentProgress {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  if (typeof r["type"] !== "string") return false;
  // Optional fields are loosely validated when present
  if (r["total"] !== undefined && typeof r["total"] !== "number") return false;
  if (r["enrichedCount"] !== undefined && typeof r["enrichedCount"] !== "number") return false;
  if (r["contactId"] !== undefined && typeof r["contactId"] !== "string") return false;
  if (r["contactName"] !== undefined && typeof r["contactName"] !== "string") return false;
  if (r["stage"] !== undefined && typeof r["stage"] !== "string") return false;
  if (r["tags"] !== undefined && !Array.isArray(r["tags"])) return false;
  if (r["confidenceScore"] !== undefined && typeof r["confidenceScore"] !== "number") return false;
  if (r["error"] !== undefined && typeof r["error"] !== "string") return false;
  if (r["errors"] !== undefined && !Array.isArray(r["errors"])) return false;
  if (r["totalContacts"] !== undefined && typeof r["totalContacts"] !== "number") return false;
  return true;
}

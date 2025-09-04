import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Contact } from "@/server/db/schema";

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
  enrichedCount: number;
  totalContacts: number;
  errors: string[];
}

interface ContactsQueryData {
  data: Contact[];
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
    enrichedCount: 0,
    totalContacts: 0,
    errors: [],
  });

  const startEnrichment = useCallback(async () => {
    setState({
      isRunning: true,
      progress: 0,
      currentContact: null,
      enrichedCount: 0,
      totalContacts: 0,
      errors: [],
    });

    try {
      const response = await fetch("/api/contacts-new/enrich?stream=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrf(),
        },
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
                    };

                  case "progress":
                    return {
                      ...prev,
                      currentContact: data.contactName ?? null,
                      progress: data.total ? ((data.enrichedCount ?? 0) / data.total) * 100 : 0,
                    };

                  case "enriched":
                    // Update React Query cache with enriched contact data
                    queryClient.setQueryData(
                      ["contacts"],
                      (oldData: ContactsQueryData | undefined) => {
                        if (!oldData?.data) return oldData;

                        return {
                          ...oldData,
                          data: oldData.data.map((contact: Contact) =>
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
                      console.warn("Enrichment errors:", data.errors);
                    }

                    // Invalidate queries to refresh data
                    void queryClient.invalidateQueries({ queryKey: ["/api/contacts-new"] });

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
            } catch (error) {
              console.error("Error parsing SSE data:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming enrichment error:", error);
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

// Helper to get CSRF token from cookie
function getCsrf(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1] ?? "") : "";
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

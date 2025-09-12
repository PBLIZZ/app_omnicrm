"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import type { OmniClientsListResponseDTO } from "@/lib/validation/schemas/omniClients";

export function useOmniClientCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadCount = async (): Promise<void> => {
      try {
        // Fetch without query params to get total count
        const data = await apiClient.get<OmniClientsListResponseDTO>("/api/omni-clients");
        if (isMounted) {
          console.error("OmniClients count loaded:", data.total, "items:", data.items?.length);
          setCount(data.total);
        }
      } catch (error) {
        // Log error for debugging
        console.error("Failed to load OmniClients count:", error);
        if (isMounted) {
          setCount(0);
        }
      }
    };

    void loadCount();

    return () => {
      isMounted = false;
    };
  }, []);

  return count;
}

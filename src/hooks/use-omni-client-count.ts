"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";

type CountResponse = {
  count: number;
};

export function useOmniClientCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadCount = async (): Promise<void> => {
      try {
        // Use dedicated count endpoint for better performance
        const data = await apiClient.get<CountResponse>("/api/omni-clients/count");
        if (isMounted) {
          setCount(data.count);
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

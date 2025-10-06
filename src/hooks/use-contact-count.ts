"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";

export function useContactCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadCount = async (): Promise<void> => {
      try {
        // apiClient returns unwrapped data directly
        const data = await apiClient.get<{ count: number }>("/api/contacts/count");
        if (isMounted) {
          setCount(data.count);
        }
      } catch (error) {
        console.error("Failed to load contact count:", error);
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

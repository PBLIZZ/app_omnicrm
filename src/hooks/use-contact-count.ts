"use client";

import { useState, useEffect } from "react";
import { fetchContacts } from "@/components/contacts/api";

// Simple cache to prevent excessive API calls
let cachedCount: number | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useContactCount(): number {
  const [count, setCount] = useState(() => {
    // Initialize with cached value if available and fresh
    if (cachedCount !== null && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedCount;
    }
    return 0;
  });

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;

    const loadCount = async (retryCount = 0): Promise<void> => {
      try {
        // Check cache first
        if (cachedCount !== null && Date.now() - cacheTimestamp < CACHE_DURATION) {
          if (isMounted) {
            setCount(cachedCount);
          }
          return;
        }

        // Fetch without query params; server defaults provide total count
        const data = await fetchContacts();
        if (isMounted) {
          setCount(data.total);
          // Update cache
          cachedCount = data.total;
          cacheTimestamp = Date.now();
        }
      } catch (error: any) {
        console.error("Failed to fetch contact count:", error);

        // Handle rate limiting with exponential backoff
        if (error?.message?.includes("rate_limited") && retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`Rate limited, retrying in ${delay}ms...`);
          retryTimeout = setTimeout(() => {
            if (isMounted) {
              loadCount(retryCount + 1);
            }
          }, delay);
          return;
        }

        // For other errors, just keep count at 0
        if (isMounted) {
          setCount(0);
        }
      }
    };

    void loadCount();

    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []);

  return count;
}

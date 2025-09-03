"use client";

import { useState, useEffect } from "react";
import { fetchContacts } from "@/lib/api/contacts";

export function useContactCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadCount = async (): Promise<void> => {
      try {
        // Fetch without query params; server defaults provide total count
        const data = await fetchContacts();
        if (isMounted) {
          setCount(data.total);
        }
      } catch (error) {
        // Silent error - just keep count at 0
        console.error("Failed to fetch contact count:", error);
      }
    };

    void loadCount();

    return () => {
      isMounted = false;
    };
  }, []);

  return count;
}

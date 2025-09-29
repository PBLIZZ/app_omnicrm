"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { Result, isErr, isOk } from "@/lib/utils/result";

type CountResponse = {
  count: number;
};

export function useContactCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadCount = async (): Promise<void> => {
      try {
        // Use dedicated count endpoint for better performance
        const result =
          await apiClient.get<Result<CountResponse, { message: string; code: string }>>(
            "/api/contacts/count",
          );
        if (isErr(result)) {
          throw new Error(result.error.message);
        }
        if (!isOk(result)) {
          throw new Error("Invalid result state");
        }
        if (isMounted) {
          setCount(result.data.count);
        }
      } catch {
        // Silent error handling - set count to 0 on failure
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

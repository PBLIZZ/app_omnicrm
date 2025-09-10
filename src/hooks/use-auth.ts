"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { fetchCurrentUser } from "@/lib/services/client/auth.service";

export type UseAuthResult = {
  user: User | null;
  isLoading: boolean;
};

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async (): Promise<void> => {
      try {
        const { user: currentUser } = await fetchCurrentUser();
        if (mounted) setUser(currentUser ?? null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { user, isLoading };
}

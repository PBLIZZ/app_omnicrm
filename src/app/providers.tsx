"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { fetchCurrentUser } from "@/lib/auth/service";

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
        const { user: u } = await fetchCurrentUser();
        if (mounted) setUser(u ?? null);
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

// Optional placeholder provider to satisfy potential usage; does not provide context
export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  return <>{children}</>;
}

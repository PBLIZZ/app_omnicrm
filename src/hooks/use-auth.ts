"use client";

import { useEffect, useState, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { fetchCurrentUser } from "@/lib/services/client/auth.service";

export type UseAuthResult = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
};

// Debug logging helper
function debugLog(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[USE-AUTH-DEBUG] ${message}`, data ?? "");
  }
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;
    debugLog("useAuth hook initialized");

    // Failsafe timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (mounted && isLoading) {
        debugLog("Failsafe timeout triggered - forcing loading to false after 15 seconds");
        setIsLoading(false);
        setError(new Error("Authentication check timed out"));
      }
    }, 15000); // 15 second failsafe

    const initAuth = async (): Promise<void> => {
      try {
        debugLog("Starting authentication check...");
        const { user: currentUser, error: authError } = await fetchCurrentUser();

        if (mounted) {
          if (authError) {
            debugLog("Auth error received:", authError.message);
            setError(authError);
            setUser(null);
          } else {
            debugLog("Auth check completed, user:", currentUser ? "found" : "null");
            setUser(currentUser ?? null);
            setError(null);
          }
        }
      } catch (e) {
        debugLog("Auth hook exception:", e);
        if (mounted) {
          const error = e instanceof Error ? e : new Error(String(e));
          setError(error);
          setUser(null);
        }
      } finally {
        if (mounted) {
          debugLog("Setting loading to false");
          setIsLoading(false);
          // Clear the failsafe timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        }
      }
    };

    void initAuth();

    return () => {
      mounted = false;
      debugLog("useAuth cleanup - component unmounted");
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array is correct - this should only run once on mount

  return { user, isLoading, error };
}

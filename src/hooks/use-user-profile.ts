"use client";

import { useEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/services/client/auth.service";

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface UseUserProfileResult {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch current user profile data including display name and avatar
 * Extracts displayName and avatarUrl from Supabase auth user metadata
 */
export function useUserProfile(): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const { user, error: authError } = await fetchCurrentUser();

        if (!mounted) return;

        if (authError) {
          setError(authError);
          setProfile(null);
          return;
        }

        if (!user) {
          setProfile(null);
          return;
        }

        // Extract profile data from user metadata
        const displayName = user.user_metadata?.["full_name"] as string | undefined;
        const avatarUrl = user.user_metadata?.["avatar_url"] as string | undefined;

        const userProfile: UserProfile = {
          id: user.id,
          email: user.email ?? "",
          ...(displayName && { displayName }),
          ...(avatarUrl && { avatarUrl }),
          createdAt: user.created_at,
        };

        setProfile(userProfile);
      } catch (err) {
        if (mounted) {
          const errorInstance = err instanceof Error ? err : new Error(String(err));
          setError(errorInstance);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      mounted = false;
    };
  }, []);

  return { profile, isLoading, error };
}

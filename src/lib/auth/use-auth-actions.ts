import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { AuthFormData } from "./auth-utils";

export function useAuthActions(): {
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (data: AuthFormData) => Promise<{ error: string | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  isSubmitting: boolean;
  isGoogle: boolean;
} {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogle, setIsGoogle] = useState(false);

  // Email/Password Sign In
  const signInWithPassword = async (
    email: string,
    password: string,
  ): Promise<{ error: string | null }> => {
    setIsSubmitting(true);
    try {
      const { error } = await getSupabaseBrowser().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error: error?.message ?? null };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Email/Password Sign Up
  const signUpWithPassword = async (data: AuthFormData): Promise<{ error: string | null }> => {
    setIsSubmitting(true);
    try {
      const { error } = await getSupabaseBrowser().auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: {
            full_name: data.fullName.trim(),
          },
        },
      });
      return { error: error?.message ?? null };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Magic Link (passwordless)
  const signInWithMagicLink = async (email: string): Promise<{ error: string | null }> => {
    setIsSubmitting(true);
    try {
      const { error } = await getSupabaseBrowser().auth.signInWithOtp({
        email: email.trim(),
      });
      return { error: error?.message ?? null };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot Password
  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    setIsSubmitting(true);
    try {
      const { error } = await getSupabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google OAuth
  const signInWithGoogle = async (): Promise<void> => {
    setIsGoogle(true);
    try {
      // Use server-initiated flow so PKCE verifier and session cookies are handled server-side
      window.location.assign(`/auth/signin/google`);
    } finally {
      // no-op; navigation will replace page
    }
  };

  return {
    signInWithPassword,
    signUpWithPassword,
    signInWithMagicLink,
    resetPassword,
    signInWithGoogle,
    isSubmitting,
    isGoogle,
  };
}

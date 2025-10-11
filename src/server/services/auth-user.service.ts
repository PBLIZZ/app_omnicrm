/**
 * Auth User Service
 *
 * Handles user authentication data retrieval and management
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export interface UserData {
  id: string;
  email: string | undefined;
  user_metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuthUserServiceOptions {
  userId: string;
  isE2EMode?: boolean;
}

export class AuthUserService {
  /**
   * Get authenticated user data with E2E mode support
   */
  static async getUserData(options: AuthUserServiceOptions): Promise<UserData> {
    const { userId, isE2EMode } = options;

    // For E2E mode, return minimal user data
    if (isE2EMode) {
      return this.getE2EUserData(userId);
    }

    // For real auth, get full user data from Supabase
    return this.getSupabaseUserData();
  }

  /**
   * Get mock user data for E2E testing
   */
  private static getE2EUserData(userId: string): UserData {
    return {
      id: userId,
      email: "test-e2e@example.com",
      user_metadata: {
        name: "E2E Test User",
      },
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Get real user data from Supabase
   */
  private static async getSupabaseUserData(): Promise<UserData> {
    const cookieStore = await cookies();
    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const supabasePublishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];

    if (!supabaseUrl || !supabasePublishableKey) {
      throw new Error("Server misconfigured");
    }

    const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      throw new Error("Unauthorized");
    }

    // Return user data (safe to expose to client)
    return {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
      created_at: data.user.created_at,
    };
  }

  /**
   * Check if we're in E2E testing mode
   */
  static isE2EMode(): boolean {
    return process.env["NODE_ENV"] !== "production" && Boolean(process.env["E2E_USER_ID"]);
  }

  /**
   * Get environment configuration for Supabase connection
   */
  static getSupabaseConfig(): { url: string; key: string } {
    const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const key = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];

    if (!url || !key) {
      throw new Error("Server misconfigured - missing Supabase environment variables");
    }

    return { url, key };
  }
}
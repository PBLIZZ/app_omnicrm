import { sql } from "drizzle-orm";
import type { DbClient } from "@/server/db/client";

export interface UserContext {
  email: string;
  avatarUrl?: string | undefined;
}

export interface UserProfile {
  id: string;
  email: string;
  avatarUrl?: string | undefined;
  displayName?: string | undefined;
  createdAt: string;
}

/**
 * Repository for querying the auth.users table (Supabase auth schema)
 * Provides controlled access to user authentication data
 * Uses DbClient constructor injection pattern.
 * Throws errors on failure - no Result wrapper.
 */
export class AuthUserRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Get user context (email and avatar) by user ID from auth.users table
   * Replaces raw SQL from contact-intelligence.service.ts
   */
  async getUserContext(userId: string): Promise<UserContext | null> {
    const result = await this.db.execute(sql`
      SELECT email, raw_user_meta_data
      FROM auth.users
      WHERE id = ${userId}
      LIMIT 1
    `);

    const rows = (
      result as unknown as {
        rows?: Array<{
          email: string;
          raw_user_meta_data: Record<string, unknown> | null;
        }>;
      }
    ).rows;

    const row = rows?.[0];
    if (!row) return null;

    const avatarUrl = row.raw_user_meta_data?.["avatar_url"] as string | undefined;

    return {
      email: row.email,
      avatarUrl: avatarUrl ?? undefined,
    };
  }

  /**
   * Check if user exists by ID
   */
  async userExists(userId: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1
      FROM auth.users
      WHERE id = ${userId}
      LIMIT 1
    `);

    const rows = (
      result as unknown as {
        rows?: Array<Record<string, unknown>>;
      }
    ).rows;

    return Boolean(rows?.length);
  }

  /**
   * Get basic user info by ID
   * Useful for user validation and basic profile data
   */
  async getUserInfo(
    userId: string,
  ): Promise<{ id: string; email: string; created_at: string } | null> {
    const result = await this.db.execute(sql`
      SELECT id, email, created_at
      FROM auth.users
      WHERE id = ${userId}
      LIMIT 1
    `);

    const rows = (
      result as unknown as {
        rows?: Array<{
          id: string;
          email: string;
          created_at: string;
        }>;
      }
    ).rows;

    return rows?.[0] ?? null;
  }

  /**
   * Get full user profile including avatar for intake forms
   * This method provides comprehensive user data for display purposes
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const result = await this.db.execute(sql`
      SELECT id, email, created_at, raw_user_meta_data
      FROM auth.users
      WHERE id = ${userId}
      LIMIT 1
    `);

    const rows = (
      result as unknown as {
        rows?: Array<{
          id: string;
          email: string;
          created_at: string;
          raw_user_meta_data: Record<string, unknown> | null;
        }>;
      }
    ).rows;

    const row = rows?.[0];
    if (!row) return null;

    const avatarUrl = row.raw_user_meta_data?.["avatar_url"] as string | undefined;
    const displayName = row.raw_user_meta_data?.["full_name"] as string | undefined;

    return {
      id: row.id,
      email: row.email,
      avatarUrl: avatarUrl ?? undefined,
      displayName: displayName ?? undefined,
      createdAt: row.created_at,
    };
  }
}

export function createAuthUserRepository(db: DbClient): AuthUserRepository {
  return new AuthUserRepository(db);
}

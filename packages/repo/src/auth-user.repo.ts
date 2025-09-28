// src/server/repositories/auth-user.repo.ts
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { ok, DbResult, dbError } from "@/lib/utils/result";

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
 */
export class AuthUserRepository {
  /**
   * Get user context (email and avatar) by user ID from auth.users table
   * Replaces raw SQL from contact-intelligence.service.ts
   */
  static async getUserContext(userId: string): Promise<DbResult<UserContext>> {
    try {
      const db = await getDb();

      // Use Drizzle's sql template for cross-schema query
      const result = await db.execute(sql`
        SELECT email, raw_user_meta_data
        FROM auth.users
        WHERE id = ${userId}
        LIMIT 1
      `);

      // Type-safe access to database result
      const resultsWithRows = result as unknown as {
        rows?: Array<{
          email: string;
          raw_user_meta_data: Record<string, unknown> | null;
        }>;
      };

      if (resultsWithRows.rows?.length && resultsWithRows.rows[0]) {
        const userData = resultsWithRows.rows[0];
        const avatarUrl = userData.raw_user_meta_data?.["avatar_url"] as string | undefined;

        return ok({
          email: userData.email,
          avatarUrl: avatarUrl ?? undefined,
        });
      }

      return dbError("USER_NOT_FOUND", "User not found", { userId });
    } catch (getUserContextError) {
      console.error("Failed to fetch user context:", getUserContextError);
      return dbError("DATABASE_ERROR", "Failed to fetch user context", getUserContextError);
    }
  }

  /**
   * Check if user exists by ID
   */
  static async userExists(userId: string): Promise<DbResult<boolean>> {
    try {
      const db = await getDb();

      const result = await db.execute(sql`
        SELECT 1
        FROM auth.users
        WHERE id = ${userId}
        LIMIT 1
      `);

      const resultsWithRows = result as unknown as {
        rows?: Array<{ [key: string]: unknown }>;
      };

      return ok(Boolean(resultsWithRows.rows?.length));
    } catch (checkUserError) {
      console.warn("Failed to check user existence:", checkUserError);
      return dbError("DATABASE_ERROR", "Failed to check user existence", checkUserError);
    }
  }

  /**
   * Get basic user info by ID
   * Useful for user validation and basic profile data
   */
  static async getUserInfo(userId: string): Promise<
    DbResult<{
      id: string;
      email: string;
      created_at: string;
    } | null>
  > {
    try {
      const db = await getDb();

      const result = await db.execute(sql`
        SELECT id, email, created_at
        FROM auth.users
        WHERE id = ${userId}
        LIMIT 1
      `);

      const resultsWithRows = result as unknown as {
        rows?: Array<{
          id: string;
          email: string;
          created_at: string;
        }>;
      };

      if (resultsWithRows.rows?.length && resultsWithRows.rows[0]) {
        return ok(resultsWithRows.rows[0]);
      }

      return ok(null);
    } catch (getUserError) {
      console.warn("Failed to get user info:", getUserError);
      return dbError("DATABASE_ERROR", "Failed to get user info", getUserError);
    }
  }

  /**
   * Get full user profile including avatar for intake forms
   * This method provides comprehensive user data for display purposes
   */
  static async getUserProfile(userId: string): Promise<DbResult<UserProfile | null>> {
    try {
      const db = await getDb();

      const result = await db.execute(sql`
        SELECT id, email, created_at, raw_user_meta_data
        FROM auth.users
        WHERE id = ${userId}
        LIMIT 1
      `);

      const resultsWithRows = result as unknown as {
        rows?: Array<{
          id: string;
          email: string;
          created_at: string;
          raw_user_meta_data: Record<string, unknown> | null;
        }>;
      };

      if (resultsWithRows.rows?.length && resultsWithRows.rows[0]) {
        const userData = resultsWithRows.rows[0];
        const avatarUrl = userData.raw_user_meta_data?.["avatar_url"] as string | undefined;
        const displayName = userData.raw_user_meta_data?.["full_name"] as string | undefined;

        return ok({
          id: userData.id,
          email: userData.email,
          avatarUrl: avatarUrl ?? undefined,
          displayName: displayName ?? undefined,
          createdAt: userData.created_at,
        });
      }

      return ok(null);
    } catch (getUserProfileError) {
      console.error("Failed to get user profile:", getUserProfileError);
      return dbError("DATABASE_ERROR", "Failed to get user profile", getUserProfileError);
    }
  }
}

// Named exports for easier importing
export const getUserContext = AuthUserRepository.getUserContext;
export const userExists = AuthUserRepository.userExists;
export const getUserInfo = AuthUserRepository.getUserInfo;
export const getUserProfile = AuthUserRepository.getUserProfile;

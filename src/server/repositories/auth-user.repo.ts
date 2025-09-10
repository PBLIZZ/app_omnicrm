// src/server/repositories/auth-user.repo.ts
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";

export interface UserContext {
  email: string;
}

/**
 * Repository for querying the auth.users table (Supabase auth schema)
 * Provides controlled access to user authentication data
 */
export class AuthUserRepository {
  /**
   * Get user context (email) by user ID from auth.users table
   * Replaces raw SQL from contact-intelligence.service.ts
   */
  static async getUserContext(userId: string): Promise<UserContext | null> {
    try {
      const db = await getDb();

      // Use Drizzle's sql template for cross-schema query
      const result = await db.execute(sql`
        SELECT email
        FROM auth.users
        WHERE id = ${userId}
        LIMIT 1
      `);

      // Type-safe access to database result
      const resultsWithRows = result as unknown as {
        rows?: Array<{ email: string }>;
      };

      if (resultsWithRows.rows && resultsWithRows.rows.length > 0 && resultsWithRows.rows[0]) {
        return {
          email: resultsWithRows.rows[0].email,
        };
      }

      return null;
    } catch (getUserContextError) {
      console.error("Failed to fetch user context:", getUserContextError);
      return null;
    }
  }

  /**
   * Check if user exists by ID
   */
  static async userExists(userId: string): Promise<boolean> {
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

      return Boolean(resultsWithRows.rows && resultsWithRows.rows.length > 0);
    } catch (checkUserError) {
      console.warn("Failed to check user existence:", checkUserError);
      return false;
    }
  }

  /**
   * Get basic user info by ID
   * Useful for user validation and basic profile data
   */
  static async getUserInfo(userId: string): Promise<{
    id: string;
    email: string;
    created_at: string;
  } | null> {
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

      if (resultsWithRows.rows && resultsWithRows.rows.length > 0 && resultsWithRows.rows[0]) {
        return resultsWithRows.rows[0];
      }

      return null;
    } catch (getUserError) {
      console.warn("Failed to get user info:", getUserError);
      return null;
    }
  }
}

// Named exports for easier importing
export const getUserContext = AuthUserRepository.getUserContext;
export const userExists = AuthUserRepository.userExists;
export const getUserInfo = AuthUserRepository.getUserInfo;

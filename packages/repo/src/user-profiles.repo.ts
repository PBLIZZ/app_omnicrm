import { eq } from "drizzle-orm";
import type { DbClient } from "@/server/db/client";
import {
  userProfiles,
  type UserProfile,
  type CreateUserProfile,
  type UpdateUserProfile,
} from "@/server/db/schema";

/**
 * UserProfilesRepository - Data access layer for practitioner profiles
 *
 * Handles CRUD operations for extended user profile data including:
 * - Preferred name for client communications
 * - Organization/practice name
 * - Custom profile photo (overrides Google OAuth photo)
 * - Professional bio, phone, website
 *
 * Security: All operations protected by RLS policies (user can only access own profile)
 */
export class UserProfilesRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Get user profile by user ID
   * Returns null if profile doesn't exist yet
   */
  async getByUserId(userId: string): Promise<UserProfile | null> {
    const [profile] = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    return profile ?? null;
  }

  /**
   * Create a new user profile
   * Throws if profile already exists (primary key constraint)
   */
  async create(data: CreateUserProfile): Promise<UserProfile> {
    const [profile] = await this.db.insert(userProfiles).values(data).returning();

    if (!profile) {
      throw new Error("Insert returned no data");
    }

    return profile;
  }

  /**
   * Update existing user profile
   * Returns null if profile doesn't exist
   */
  async update(userId: string, data: UpdateUserProfile): Promise<UserProfile | null> {
    const [updated] = await this.db
      .update(userProfiles)
      .set(data)
      .where(eq(userProfiles.userId, userId))
      .returning();

    return updated ?? null;
  }

  /**
   * Create or update user profile (upsert)
   * Returns the created or updated profile
   */
  async upsert(userId: string, data: UpdateUserProfile): Promise<UserProfile> {
    const [profile] = await this.db
      .insert(userProfiles)
      .values({ userId, ...data })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: data,
      })
      .returning();

    if (!profile) {
      throw new Error("Upsert returned no data");
    }

    return profile;
  }

  /**
   * Delete user profile
   * Returns true if deleted, false if didn't exist
   */
  async delete(userId: string): Promise<boolean> {
    const result = await this.db.delete(userProfiles).where(eq(userProfiles.userId, userId));

    return result.rowCount ? result.rowCount > 0 : false;
  }
}

/**
 * Factory function to create UserProfilesRepository instance
 */
export function createUserProfilesRepository(db: DbClient): UserProfilesRepository {
  return new UserProfilesRepository(db);
}

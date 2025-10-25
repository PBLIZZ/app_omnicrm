import { getDb } from "@/server/db/client";
import { createUserProfilesRepository, type UserProfile, type UpdateUserProfile } from "@repo";
import { AppError } from "@/lib/errors/app-error";

/**
 * User Profile Service - Business logic for practitioner profile management
 *
 * Handles extended user profile data for external communications:
 * - Preferred name (e.g., "Dr. Jane Smith" instead of Google account name)
 * - Organization/practice name (e.g., "Wellness Studio NYC")
 * - Custom profile photo (overrides Google OAuth photo)
 * - Professional bio, phone, website
 *
 * Security: Row Level Security (RLS) enforces user can only access own profile
 * Privacy: All data encrypted at rest with AES-256-GCM
 */

/**
 * Get user profile for a practitioner
 * Returns null if profile doesn't exist yet (user hasn't completed setup)
 */
export async function getUserProfileService(userId: string): Promise<UserProfile | null> {
  try {
    const db = await getDb();
    const repo = createUserProfilesRepository(db);

    return await repo.getByUserId(userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to fetch user profile",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Create or update user profile (upsert)
 * Used when practitioner updates their profile settings
 */
export async function upsertUserProfileService(
  userId: string,
  data: UpdateUserProfile,
): Promise<UserProfile> {
  try {
    const db = await getDb();
    const repo = createUserProfilesRepository(db);

    return await repo.upsert(userId, data);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to update user profile",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Delete user profile
 * Part of GDPR compliance - allows practitioners to remove extended profile data
 */
export async function deleteUserProfileService(userId: string): Promise<void> {
  try {
    const db = await getDb();
    const repo = createUserProfilesRepository(db);

    await repo.delete(userId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to delete user profile",
      "DB_ERROR",
      "database",
      false,
      500,
    );
  }
}

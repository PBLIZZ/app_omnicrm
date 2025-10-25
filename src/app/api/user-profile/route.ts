import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  getUserProfileService,
  upsertUserProfileService,
} from "@/server/services/user-profile.service";
import { UpdateUserProfileSchema, UserProfileSchema } from "@/server/db/business-schemas";

/**
 * GET /api/user-profile - Get current user's profile
 *
 * Returns practitioner profile data for external communications.
 * Returns null if profile hasn't been created yet (user hasn't completed profile setup).
 *
 * Security: Authenticated only, RLS enforces user can only access own profile
 */
export const GET = handleGetWithQueryAuth({}, UserProfileSchema.nullable(), async (_query, userId) => {
  return await getUserProfileService(userId);
});

/**
 * PATCH /api/user-profile - Update (or create) user profile
 *
 * Upserts practitioner profile data. All fields are optional for partial updates.
 * Used when practitioner updates their profile settings.
 *
 * Security: Authenticated only, RLS enforces user can only update own profile
 */
export const PATCH = handleAuth(
  UpdateUserProfileSchema,
  UserProfileSchema,
  async (data, userId) => {
    return await upsertUserProfileService(userId, data);
  },
);

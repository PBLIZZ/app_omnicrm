/** DELETE /api/user/delete — Permanent account deletion for GDPR compliance (auth required). */
import {
  UserDeletionRequestSchema,
  UserDeletionResponseSchema,
} from "@/server/db/business-schemas";
import { deleteUserDataService } from "@/server/services/user-deletion.service";
import { handleAuth } from "@/lib/api";

/**
 * Delete user account and all associated data
 */
export const DELETE = handleAuth(
  UserDeletionRequestSchema,
  UserDeletionResponseSchema,
  async (
    data,
    userId,
  ): Promise<{
    success: boolean;
    message: string;
    deletedAt: string;
    userId?: string;
  }> => {
    const { confirmation, acknowledgeIrreversible } = data;

    // Execute deletion
    const result = await deleteUserDataService(userId, {
      confirmation,
      acknowledgeIrreversible,
    });

    // Map service result to API response
    return {
      success: result.deleted,
      message: result.message,
      deletedAt: result.deletedAt,
      ...(result.deletionResults && { userId }),
    };
  },
);

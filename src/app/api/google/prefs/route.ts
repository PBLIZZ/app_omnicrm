/**
 * GET/PUT /api/google/prefs — Google sync preferences management
 *
 * Manages user preferences for Google Gmail and Calendar sync operations.
 * Replaces the deprecated /api/settings/sync/prefs endpoint.
 */
import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import {
  GooglePrefsQuerySchema,
  GooglePrefsResponseSchema,
  GooglePrefsUpdateSchema,
} from "@/server/db/business-schemas";
import { GoogleIntegrationService } from "@/server/services/google-integration.service";

export const GET = handleGetWithQueryAuth(
  GooglePrefsQuerySchema,
  GooglePrefsResponseSchema,
  async (query, userId) => {
    return await GoogleIntegrationService.getSyncPreferences(userId);
  },
);

export const PUT = handleAuth(
  GooglePrefsUpdateSchema,
  GooglePrefsResponseSchema,
  async (data, userId) => {
    try {
      // Use service to build clean update object and process the update
      const updateData = GoogleIntegrationService.buildCleanUpdateObject(data);
      await GoogleIntegrationService.updateSyncPreferences(userId, updateData);

      // Return the updated preferences
      return await GoogleIntegrationService.getSyncPreferences(userId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Check for validation errors from the service
      if (errorMessage.includes("cannot be changed after initial sync")) {
        throw new Error(errorMessage);
      }

      throw new Error("Failed to update Google sync preferences");
    }
  },
);

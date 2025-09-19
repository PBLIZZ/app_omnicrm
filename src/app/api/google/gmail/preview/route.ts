/**
 * POST /api/google/gmail/preview — Generate preview of Gmail sync data volume
 *
 * Estimates the number of emails and data size that would be synced based on user preferences.
 * Does not perform actual sync, only provides estimates for user confirmation.
 */

import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { GmailPreferencesSchema, SyncPreviewResponseSchema } from "@/lib/validation/schemas/sync";
import { getGoogleGmailClient } from "@/server/google/client";
import { ensureError } from "@/lib/utils/error-handler";

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_preview" },
  validation: {
    body: GmailPreferencesSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("google.gmail.preview", requestId);

  try {
    const gmailClient = await getGoogleGmailClient(userId);
    if (!gmailClient) {
      return api.error("Gmail not connected", "INTEGRATION_ERROR");
    }

    const prefs = validated.body;

    // Calculate date range for preview
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - prefs.timeRangeDays);

    // Build Gmail query for preview estimation
    const query = buildGmailQuery({
      timeRangeDays: prefs.timeRangeDays,
      importEverything: prefs.importEverything,
    });

    // Get message count estimation using Gmail API
    const searchResponse = await gmailClient.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 1, // We only need the total count
    });

    const totalMessages = searchResponse.data.resultSizeEstimate ?? 0;

    // Estimate size based on average email size (approximate 50KB per email)
    const averageEmailSizeKB = 50;
    const estimatedSizeMB = (totalMessages * averageEmailSizeKB) / 1024;

    const warnings: string[] = [];

    // Add warnings for large sync operations
    if (totalMessages > 10000) {
      warnings.push("Large sync operation detected. This may take several hours to complete.");
    }
    if (estimatedSizeMB > 500) {
      warnings.push("Estimated sync size exceeds 500MB. Consider reducing the time range.");
    }
    if (prefs.timeRangeDays === 365) {
      warnings.push("Full year sync selected. This is a one-time operation and cannot be changed later.");
    }

    const preview = {
      service: "gmail" as const,
      estimatedItems: totalMessages,
      estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100, // Round to 2 decimal places
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      details: {
        emailCount: totalMessages,
      },
      warnings,
    };

    // Validate response structure
    const validationResult = SyncPreviewResponseSchema.safeParse(preview);
    if (!validationResult.success) {
      console.error("Preview response validation failed:", validationResult.error);
      return api.error("Invalid preview response generated", "INTERNAL_ERROR");
    }

    return api.success(validationResult.data);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Handle specific Gmail API errors
    if (errorMessage.includes("invalid_grant") || errorMessage.includes("unauthorized")) {
      return api.error("Gmail authorization expired. Please reconnect.", "INTEGRATION_ERROR");
    }

    if (errorMessage.includes("rate") || errorMessage.includes("quota")) {
      return api.error("Rate limit exceeded. Please try again later.", "INTERNAL_ERROR");
    }

    return api.error(
      "Failed to generate Gmail sync preview",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

/**
 * Build Gmail search query based on preferences
 */
function buildGmailQuery(prefs: { timeRangeDays: number; importEverything: boolean }): string {
  const query: string[] = [];

  // Add time range constraint
  query.push(`newer_than:${prefs.timeRangeDays}d`);

  if (prefs.importEverything) {
    // Import everything - no additional filters
    // This includes inbox, sent, drafts, chats, all categories and labels
    return query.join(" ");
  } else {
    // For future use - currently only "everything" is supported
    // Could add specific label/category filters here
    query.push("category:primary");
    query.push("-in:chats");
    query.push("-in:drafts");
    return query.join(" ");
  }
}
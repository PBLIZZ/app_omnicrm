import { getGoogleGmailClient } from "@/server/google/client";
import { GmailPreferencesSchema, SyncPreviewResponseSchema } from "@/lib/validation/schemas/sync";
import { z } from "zod";

export interface GmailPreviewRequest {
  timeRangeDays: number;
  importEverything: boolean;
}

export interface GmailPreviewResponse {
  service: "gmail";
  estimatedItems: number;
  estimatedSizeMB: number;
  dateRange: {
    start: string;
    end: string;
  };
  details: {
    emailCount: number;
  };
  warnings: string[];
}

export class GmailPreviewService {
  /**
   * Generate Gmail sync preview with item count and size estimates
   *
   * @param userId - The user ID
   * @param preferencesData - Gmail preferences for preview
   * @returns Promise<GmailPreviewResponse> - Preview data with estimates and warnings
   */
  static async generateGmailPreview(
    userId: string,
    preferencesData: unknown,
  ): Promise<GmailPreviewResponse> {
    // Validate preferences
    const validatedPrefs = GmailPreferencesSchema.parse(preferencesData);

    // Get Gmail client
    const gmailClient = await getGoogleGmailClient(userId);
    if (!gmailClient) {
      throw new Error("Gmail not connected");
    }

    // Calculate date range
    const dateRange = this.calculateDateRange(validatedPrefs.timeRangeDays);

    // Build Gmail query
    const query = this.buildGmailQuery(validatedPrefs);

    // Get message count estimation
    const messageCount = await this.getMessageCount(gmailClient, query);

    // Calculate size estimates
    const sizeEstimate = this.calculateSizeEstimate(messageCount);

    // Generate warnings
    const warnings = this.generateWarnings(messageCount, sizeEstimate, validatedPrefs.timeRangeDays);

    const preview: GmailPreviewResponse = {
      service: "gmail",
      estimatedItems: messageCount,
      estimatedSizeMB: sizeEstimate,
      dateRange,
      details: {
        emailCount: messageCount,
      },
      warnings,
    };

    // Validate response structure
    const validationResult = SyncPreviewResponseSchema.safeParse(preview);
    if (!validationResult.success) {
      throw new Error("Invalid preview response generated");
    }

    return validationResult.data;
  }

  /**
   * Calculate date range for preview
   *
   * @param timeRangeDays - Number of days to look back
   * @returns Object with start and end ISO strings
   */
  private static calculateDateRange(timeRangeDays: number): { start: string; end: string } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRangeDays);

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };
  }

  /**
   * Build Gmail search query based on preferences
   *
   * @param prefs - Gmail preferences
   * @returns Gmail query string
   */
  private static buildGmailQuery(prefs: { timeRangeDays: number; importEverything: boolean }): string {
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

  /**
   * Get message count from Gmail API
   *
   * @param gmailClient - Gmail API client
   * @param query - Gmail search query
   * @returns Promise<number> - Number of messages
   */
  private static async getMessageCount(gmailClient: any, query: string): Promise<number> {
    try {
      const searchResponse = await gmailClient.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 1, // We only need the total count
      });

      return searchResponse.data.resultSizeEstimate ?? 0;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

      // Handle specific Gmail API errors
      if (errorMessage.includes("invalid_grant") || errorMessage.includes("unauthorized")) {
        throw new Error("Gmail authorization expired. Please reconnect.");
      }

      if (errorMessage.includes("rate") || errorMessage.includes("quota")) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }

      throw new Error(`Failed to get message count: ${errorMessage}`);
    }
  }

  /**
   * Calculate estimated size based on message count
   *
   * @param messageCount - Number of messages
   * @returns Estimated size in MB (rounded to 2 decimal places)
   */
  private static calculateSizeEstimate(messageCount: number): number {
    // Estimate size based on average email size (approximate 50KB per email)
    const averageEmailSizeKB = 50;
    const estimatedSizeMB = (messageCount * averageEmailSizeKB) / 1024;

    return Math.round(estimatedSizeMB * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Generate warnings based on sync parameters
   *
   * @param messageCount - Number of messages to sync
   * @param estimatedSizeMB - Estimated size in MB
   * @param timeRangeDays - Time range in days
   * @returns Array of warning messages
   */
  private static generateWarnings(
    messageCount: number,
    estimatedSizeMB: number,
    timeRangeDays: number,
  ): string[] {
    const warnings: string[] = [];

    // Add warnings for large sync operations
    if (messageCount > 10000) {
      warnings.push("Large sync operation detected. This may take several hours to complete.");
    }

    if (estimatedSizeMB > 500) {
      warnings.push("Estimated sync size exceeds 500MB. Consider reducing the time range.");
    }

    if (timeRangeDays === 365) {
      warnings.push(
        "Full year sync selected. This is a one-time operation and cannot be changed later.",
      );
    }

    return warnings;
  }
}
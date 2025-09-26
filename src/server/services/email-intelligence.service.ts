/**
 * Email Intelligence Service
 *
 * Handles email intelligence processing for raw Gmail events.
 * Provides admin functionality for triggering and monitoring
 * email intelligence jobs and statistics.
 *
 * Note: Currently disabled for build stability.
 * TODO: Implement email intelligence processing when system is stable.
 */

export interface EmailIntelligenceStats {
  totalProcessed: number;
  recentProcessed: unknown[];
  lastProcessedAt?: string;
  status: "disabled" | "active" | "processing";
  error?: string;
}

export interface EmailIntelligenceResult {
  success: boolean;
  message: string;
  processedCount?: number;
  error?: string;
}

export class EmailIntelligenceService {
  /**
   * Trigger email intelligence processing
   * Currently disabled for build stability
   */
  static async triggerProcessing(): Promise<EmailIntelligenceResult> {
    // TODO:REINSTATE-#1234 - Temporarily disabled for build fix (2025-01-XX)
    // Owner: Development Team
    // Reason: Email intelligence processing causing build failures
    // Link: https://github.com/your-org/app_omnicrm/issues/1234
    // When to remove: After fixing email intelligence processing issues

    return {
      success: false,
      message: "Email intelligence processing is temporarily disabled for build stability",
      error: "SERVICE_TEMPORARILY_DISABLED",
    };
  }

  /**
   * Get email intelligence statistics and recent processed emails
   * Currently disabled for build stability
   */
  static async getStatistics(): Promise<EmailIntelligenceStats> {
    // TODO:REINSTATE-#1234 - Temporarily disabled for build fix (2025-01-XX)
    // Owner: Development Team
    // Reason: Email intelligence processing causing build failures
    // Link: https://github.com/your-org/app_omnicrm/issues/1234
    // When to remove: After fixing email intelligence processing issues

    return {
      totalProcessed: 0,
      recentProcessed: [],
      status: "disabled",
      error: "Service temporarily disabled for build stability",
    };
  }

  /**
   * Future implementation: Process raw Gmail events for intelligence extraction
   */
  private static async processRawGmailEvents(): Promise<EmailIntelligenceResult> {
    // TODO: Implement when email intelligence system is stable
    // This would:
    // 1. Query raw_events for unprocessed Gmail events
    // 2. Extract intelligence using AI/LLM
    // 3. Store insights in ai_insights table
    // 4. Update processing status

    throw new Error("Not implemented - service disabled");
  }

  /**
   * Future implementation: Get processing statistics from database
   */
  private static async getProcessingStats(): Promise<EmailIntelligenceStats> {
    // TODO: Implement when email intelligence system is stable
    // This would:
    // 1. Query ai_insights for email-related insights
    // 2. Get recent processing timestamps
    // 3. Calculate success rates and error counts

    throw new Error("Not implemented - service disabled");
  }
}
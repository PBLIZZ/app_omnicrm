// Extracted bulk insights generation

import { logger } from "@/lib/observability";
import { generateContactInsights } from "@/server/ai/contacts/generate-contact-insights";
// import type { ContactInsightsWithNote } from "@/server/ai/types/connect-types";

export interface InsightResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function bulkGenerateInsights(
  userId: string,
  contactEmails: string[],
  delayMs: number = 100,
  onProgress?: (completed: number, total: number, email: string, result: InsightResult) => void,
): Promise<Map<string, InsightResult>> {
  const insights = new Map<string, InsightResult>();

  await logger.info("Bulk generating insights", {
    operation: "bulk_generate_insights",
    userId,
    additionalData: { contactCount: contactEmails.length },
  });

  for (let i = 0; i < contactEmails.length; i++) {
    const email = contactEmails[i];
    let result: InsightResult;

    try {
      const contactInsights = await generateContactInsights(userId, email);
      result = { success: true, data: contactInsights };
    } catch (error) {
      logger.error("Failed to generate insights for contact", {
        operation: "bulk_generate_insights",
        userId,
        email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    insights.set(email, result);

    // Call progress callback if provided
    if (onProgress) {
      try {
        await onProgress(i + 1, contactEmails.length, email, result);
      } catch (callbackError) {
        logger.warn("Progress callback failed", {
          operation: "bulk_generate_insights",
          error: callbackError instanceof Error ? callbackError.message : String(callbackError),
        });
      }
    }

    // Apply rate limit delay only between iterations (not after the last one)
    if (i < contactEmails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return insights;
}

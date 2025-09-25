// Extracted bulk insights generation

import { logger } from "@/lib/observability";
import { generateContactInsights } from "@/server/ai/clients/generate-contact-insights";
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
): Promise<Map<string, InsightResult>> {
  const insights = new Map<string, InsightResult>();

  await logger.info("Bulk generating insights", {
    operation: "bulk_generate_insights",
    userId,
    additionalData: { contactCount: contactEmails.length },
  });

  for (const email of contactEmails) {
    try {
      const contactInsights = await generateContactInsights(userId, email);
      insights.set(email, { success: true, data: contactInsights });
    } catch (error) {
      console.error(`Failed to generate insights for contact ${email}:`, error);
      // Record error for this contact so processing continues
      insights.set(email, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      // Always run rate limit delay regardless of success or failure
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return insights;
}

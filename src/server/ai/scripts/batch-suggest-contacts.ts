// Enhanced batch script

import { ContactSuggestion, getContactSuggestions } from "@/server/ai/contacts/suggest-contacts";
import { logger } from "@/lib/observability";

export async function batchSuggestContacts(userId: string): Promise<{
  suggestions: ContactSuggestion[];
  wiki: { businessWiki: string[]; marketingWiki: string[] };
}> {
  if (!isBackground()) {
    logger.warn("Batch job attempted in non-background mode");
    return { suggestions: [], wiki: { businessWiki: [], marketingWiki: [] } };
  }

  let suggestions: ContactSuggestion[] = [];
  let wiki = { businessWiki: [], marketingWiki: [] };

  try {
    suggestions = await getContactSuggestions(userId);
    logger.info("Contact suggestions generated successfully", {
      userId,
      operation: "batch_suggest_contacts",
      additionalData: { suggestionCount: suggestions.length },
    });
  } catch (error) {
    logger.error("Failed to generate contact suggestions", {
      userId,
      operation: "batch_suggest_contacts",
      additionalData: { error: error instanceof Error ? error.message : String(error) },
    });
    // Continue with empty suggestions rather than failing the whole batch
  }

  // TODO: Implement wiki population
  // This is intentionally stubbed as the wiki service is not yet implemented
  // Issue: #456 - Wiki service implementation needed
  // Expected ETA: Q2 2025
  // For now, return empty arrays to maintain API contract
  logger.info("Wiki population stubbed - returning empty arrays", {
    userId,
    operation: "batch_suggest_contacts",
  });

  logger.info("Batch complete", { userId, operation: "batch_suggest_contacts" });

  return {
    suggestions,
    wiki,
  };
}

function isBackground(): boolean {
  // Check for explicit background execution indicators
  // Allow background mode in development when explicitly enabled
  return (
    process.env["BACKGROUND_MODE"] === "true" ||
    process.env["CRON_JOB"] === "true" ||
    process.argv.includes("--background") ||
    process.env.NODE_ENV === "production" // Default to production mode when no explicit flags
  );
}
// To run: ts-node batch-suggest-contacts.ts or compile to JS and run via cron

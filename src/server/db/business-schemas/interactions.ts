/**
 * Interaction Business Schema - API-specific schemas only
 *
 * For base types, import from @/server/db/schema:
 * - Interaction (select type)
 * - CreateInteraction (insert type)
 * - UpdateInteraction (partial insert type)
 *
 * This file contains ONLY UI-enhanced versions and API-specific schemas.
 */

import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { interactions, type Interaction } from "@/server/db/schema";

// Re-export base types from schema for convenience
export type { Interaction, CreateInteraction, UpdateInteraction } from "@/server/db/schema";

// Create base schema from drizzle table for UI enhancements
const selectInteractionSchema = createSelectSchema(interactions);

/**
 * UI-Enhanced Interaction Schema
 * Extends base Interaction with computed fields for UI display
 */
export const InteractionWithUISchema = selectInteractionSchema.transform((data) => ({
  ...data,
  // UI computed fields
  hasContent: !!(data.bodyText || data.subject),
  contentPreview: data.bodyText
    ? data.bodyText.slice(0, 150) + (data.bodyText.length > 150 ? "..." : "")
    : data.subject || "No content",
  isEmail: data.type === "email",
  isCall: data.type === "call",
  isMeeting: data.type === "meeting",
})) satisfies z.ZodType<Interaction & {
  hasContent: boolean;
  contentPreview: string;
  isEmail: boolean;
  isCall: boolean;
  isMeeting: boolean;
}>;

export type InteractionWithUI = z.infer<typeof InteractionWithUISchema>;

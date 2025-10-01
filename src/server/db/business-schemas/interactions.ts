/**
 * Interaction Business Schema - derived from database schema
 *
 * Handles email, call, meeting, and other interaction data
 */

import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { interactions } from "@/server/db/schema";

// Create base schemas from drizzle table
const selectInteractionSchema = createSelectSchema(interactions);

// Transform schema with UI computed fields
const BaseInteractionSchema = selectInteractionSchema;

export const InteractionSchema = BaseInteractionSchema.transform((data) => ({
  ...data,
  // UI computed fields
  hasContent: !!(data.bodyText || data.subject),
  contentPreview: data.bodyText
    ? data.bodyText.slice(0, 150) + (data.bodyText.length > 150 ? "..." : "")
    : data.subject || "No content",
  isEmail: data.type === "email",
  isCall: data.type === "call",
  isMeeting: data.type === "meeting",
}));

export type Interaction = z.infer<typeof InteractionSchema>;

export const CreateInteractionSchema = BaseInteractionSchema.omit({
  id: true,
  createdAt: true,
});

export type CreateInteraction = z.infer<typeof CreateInteractionSchema>;

export const UpdateInteractionSchema = BaseInteractionSchema.partial().required({ id: true });

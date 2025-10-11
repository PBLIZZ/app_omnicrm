// Validation utilities for clients domain

import { CONTACT_STAGES } from "@/constants/contactStages";

// Maximum number of wellness tags allowed per client
const MAX_WELLNESS_TAGS = 8;

// Define ClientStage type from CONTACT_STAGES
type ClientStage = (typeof CONTACT_STAGES)[number];

// Type guard to check if a string is a valid ClientStage
function isClientStage(stage: string): stage is ClientStage {
  return (CONTACT_STAGES as readonly string[]).includes(stage);
}

export function validateStage(stage: string): ClientStage {
  return isClientStage(stage) ? stage : "Prospect";
}

export function validateTags(tags: string[], maxTags: number = MAX_WELLNESS_TAGS): string[] {
  // Define valid wellness tags
  const validTags: readonly string[] = ["Yoga", "Massage", "Meditation", "Pilates", "Reiki", "Acupuncture"] as const;
  return tags
    .filter((tag): tag is string => validTags.includes(tag))
    .slice(0, maxTags);
}

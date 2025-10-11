// Validation utilities for clients domain

import { CLIENT_STAGES, type ClientStage } from "@/constants/clientStages";

export type WellnessTag = "Yoga" | "Massage";

// Maximum number of wellness tags allowed per client
const MAX_WELLNESS_TAGS = 8;

// Type guard to check if a string is a valid ClientStage
function isClientStage(stage: string): stage is ClientStage {
  return CLIENT_STAGES.includes(stage as ClientStage);
}

export function validateStage(stage: string): ClientStage {
  return isClientStage(stage) ? stage : "Prospect";
}

export function validateTags(tags: string[], maxTags: number = MAX_WELLNESS_TAGS): WellnessTag[] {
  const validTags: WellnessTag[] = ["Yoga", "Massage"];
  return tags
    .filter((tag) => validTags.includes(tag as WellnessTag))
    .slice(0, maxTags) as WellnessTag[];
}

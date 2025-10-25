// Validation utilities for clients domain

import { CONTACT_STAGES } from "@/constants/contactStages";

// Legacy tag validation removed - now using relational tagging system

// Define ClientStage type from CONTACT_STAGES
type ClientStage = (typeof CONTACT_STAGES)[number];

// Type guard to check if a string is a valid ClientStage
function isClientStage(stage: string): stage is ClientStage {
  return (CONTACT_STAGES as readonly string[]).includes(stage);
}

export function validateStage(stage: string): ClientStage {
  return isClientStage(stage) ? stage : "Prospect";
}

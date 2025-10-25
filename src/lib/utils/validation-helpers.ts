/**
 * Validation utilities for runtime type checking and data validation
 */

// Valid source values
const VALID_SOURCES = [
  "manual",
  "gmail_import",
  "upload",
  "calendar_import",
  "onboarding_form",
] as const;
type ValidSource = (typeof VALID_SOURCES)[number];

// Valid stage values
const VALID_STAGES = [
  "Prospect",
  "New Client",
  "Core Client",
  "Referring Client",
  "VIP Client",
  "Lost Client",
  "At Risk Client",
] as const;
type ValidStage = (typeof VALID_STAGES)[number];

/**
 * Check if a value is a valid source
 */
export function isValidSource(value: unknown): value is ValidSource {
  if (typeof value !== "string") return false;
  return VALID_SOURCES.some((source) => source === value);
}

/**
 * Check if a value is a valid stage
 */
export function isValidStage(value: unknown): value is ValidStage {
  if (typeof value !== "string") return false;
  return VALID_STAGES.some((stage) => stage === value);
}

/**
 * Check if a value is a valid string array
 */
export function isValidStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Legacy tag normalization function removed - now using relational tagging system

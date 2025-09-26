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

/**
 * Safely convert tags to string array
 * Handles Json type from database (array of strings or complex objects)
 */
export function normalizeTags(tags: unknown): string[] | null {
  if (!tags) return null;

  // Handle JSON type from database - could be any valid JSON
  if (Array.isArray(tags)) {
    return tags
      .map((item) => {
        if (typeof item === "string") {
          return item;
        } else if (typeof item === "object" && item !== null) {
          // Handle old complex tag formats
          const tagObj = item as Record<string, unknown>;
          return String(tagObj["tag"] || tagObj["name"] || tagObj["value"] || "");
        } else {
          return String(item);
        }
      })
      .filter((tag) => tag.length > 0); // Remove empty strings
  }

  // Handle single tag value (shouldn't happen but be defensive)
  if (typeof tags === "string") {
    return [tags];
  }

  return null;
}

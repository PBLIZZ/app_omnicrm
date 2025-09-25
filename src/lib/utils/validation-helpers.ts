/**
 * Validation utilities for runtime type checking and data validation
 */

// Valid source values
const VALID_SOURCES = ["manual", "gmail_import", "upload", "calendar_import"] as const;
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
  return typeof value === "string" && VALID_SOURCES.includes(value as ValidSource);
}

/**
 * Check if a value is a valid stage
 */
export function isValidStage(value: unknown): value is ValidStage {
  return typeof value === "string" && VALID_STAGES.includes(value as ValidStage);
}

/**
 * Check if a value is a valid string array
 */
export function isValidStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * Safely convert tags to string array
 * Handles both string arrays and objects with tag property
 */
export function normalizeTags(tags: unknown): string[] | null {
  if (!tags) return null;

  if (Array.isArray(tags)) {
    return tags.map((item) => {
      if (typeof item === "string") {
        return item;
      } else if (typeof item === "object" && item !== null && "tag" in item) {
        return String(item.tag);
      } else {
        return String(item);
      }
    });
  }

  return null;
}

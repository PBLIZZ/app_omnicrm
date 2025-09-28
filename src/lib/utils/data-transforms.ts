/**
 * Data transformation utilities
 * 
 * Pure functions for transforming data across client and server
 */

/**
 * Helper to normalize tag arrays from various formats
 * 
 * @param value - Unknown input value that might be tags
 * @returns Normalized string array or null
 */
export function normalizeTagArray(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value
      .map((tag) => {
        if (typeof tag === "string") return tag;
        if (typeof tag === "object" && tag !== null) {
          const tagObj = tag as Record<string, unknown>;
          return String(tagObj["tag"] || tagObj["name"] || "");
        }
        return String(tag || "");
      })
      .filter(Boolean);
  }
  return null;
}

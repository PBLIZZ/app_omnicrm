import slugify from "slugify";

/**
 * Generate slug from display name with basic validation
 * This is a CLIENT-SAFE version for preview generation only
 *
 * DO NOT import database or server modules here!
 */
export function generateSlugPreview(displayName: string): string {
  if (!displayName || displayName.trim().length === 0) {
    return `client-${Date.now()}`;
  }

  const slug = slugify(displayName, {
    lower: true,
    strict: true,
    trim: true,
  });

  // If the slug is empty or too short after processing, use a fallback
  if (!slug || slug.length < 2) {
    return `client-${Date.now()}`;
  }

  return slug;
}

/**
 * Validate if a slug is well-formed
 * Client-safe validation utility
 */
export function isValidSlug(slug: string): boolean {
  if (!slug) return false;

  // Slug should be lowercase, no spaces, alphanumeric with hyphens
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Format a slug for display (e.g., in URLs)
 * Client-safe formatting utility
 */
export function formatSlugForDisplay(slug: string | null | undefined): string {
  if (!slug) return "";
  return slug.toLowerCase().trim();
}

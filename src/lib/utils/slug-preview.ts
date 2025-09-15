import slugify from "slugify";

/**
 * Generate slug from display name with basic validation
 * This is a simpler version for client-side preview generation
 */
export function generateSlugPreview(displayName: string): string {
  const slug = slugify(displayName, {
    lower: true,
    strict: true,
    trim: true,
  });

  return slug ?? `client-${Date.now()}`;
}

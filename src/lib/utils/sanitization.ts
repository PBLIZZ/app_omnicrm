/**
 * Sanitization utilities for safe text processing
 * Prevents XSS and injection attacks in user-generated content
 */

/**
 * Sanitize text content for safe use in prompts and displays
 * @param text - The text to sanitize
 * @param maxLength - Maximum length (default: 1000)
 * @returns Sanitized text or fallback string
 */
export function sanitizeText(text: string | null | undefined, maxLength: number = 1000): string {
  if (!text || typeof text !== "string") {
    return "No content";
  }

  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, "");

  // Escape special characters that could be used for injection
  sanitized = sanitized
    .replace(/[`\\]/g, "") // Remove backticks and backslashes
    .replace(/[\r\n\t]/g, " ") // Replace control characters with spaces
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Remove instruction-like patterns that could be used for prompt injection
  const instructionPatterns = [
    /ignore\s+previous/gi,
    /you\s+are/gi,
    /assistant:/gi,
    /system:/gi,
    /user:/gi,
    /forget\s+everything/gi,
    /new\s+instructions/gi,
  ];

  for (const pattern of instructionPatterns) {
    sanitized = sanitized.replace(pattern, "");
  }

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + "...";
  }

  return sanitized || "No content";
}

/**
 * Sanitize a date string for safe display
 * @param date - The date string to sanitize
 * @returns Sanitized date or fallback string
 */
export function sanitizeDate(date: string | null | undefined): string {
  if (!date || typeof date !== "string") {
    return "No date";
  }

  // Basic date validation and sanitization
  const sanitized = sanitizeText(date, 50);

  // Check if it looks like a valid date
  const dateObj = new Date(sanitized);
  if (isNaN(dateObj.getTime())) {
    return "No date";
  }

  return sanitized;
}

/**
 * Sanitize a title for safe display
 * @param title - The title to sanitize
 * @returns Sanitized title or fallback string
 */
export function sanitizeTitle(title: string | null | undefined): string {
  if (!title || typeof title !== "string") {
    return "No title";
  }

  return sanitizeText(title, 200);
}

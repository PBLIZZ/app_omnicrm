/**
 * Sanitization utilities for safe text processing
 * Prevents XSS and injection attacks in user-generated content
 */

import sanitizeHtml from "sanitize-html";

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

  // Use sanitize-html library for robust HTML sanitization
  let sanitized = sanitizeHtml(text, {
    allowedTags: [], // Remove all HTML tags
    allowedAttributes: {}, // Remove all attributes
    disallowedTagsMode: "discard", // Remove disallowed tags
  });

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

  // Validate against ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  if (!iso8601Regex.test(sanitized)) {
    return "No date";
  }

  // Check if it parses to a valid date
  const dateObj = new Date(sanitized);
  if (isNaN(dateObj.getTime())) {
    return "No date";
  }

  // Normalize to YYYY-MM-DD format for consistency
  return dateObj.toISOString().split("T")[0];
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

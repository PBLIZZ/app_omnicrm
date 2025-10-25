/**
 * Client-side PII Detection Utility
 *
 * Lightweight PII detection for client-side validation before sending to server.
 * This mirrors the server-side detection patterns but is optimized for browser use.
 */

export interface PIIEntity {
  type: "email" | "phone" | "ssn" | "address" | "credit_card" | "ip_address";
  value: string;
  start: number;
  end: number;
  redacted: string;
}

export interface PIIValidationResult {
  hasPII: boolean;
  entities: PIIEntity[];
  detectedTypes: string[];
}

// Simplified PII patterns for client-side detection
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ip_address:
    /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  address:
    /\b\d{1,5}\s+[\w\s]{3,30}\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|circle|cir|way)\b/gi,
};

/**
 * Detect PII in text without redacting (client-side validation)
 */
export function detectPII(text: string): PIIEntity[] {
  const entities: PIIEntity[] = [];
  const processedRanges: Array<{ start: number; end: number }> = [];

  const isOverlapping = (start: number, end: number): boolean => {
    return processedRanges.some(
      (range) =>
        (start >= range.start && start < range.end) || (end > range.start && end <= range.end),
    );
  };

  // Detect each PII type
  Object.entries(PII_PATTERNS).forEach(([type, pattern]) => {
    let match;
    const regex = new RegExp(pattern);

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (!isOverlapping(start, end)) {
        entities.push({
          type: type as PIIEntity["type"],
          value: match[0],
          start,
          end,
          redacted: `[${type.toUpperCase()}]`,
        });
        processedRanges.push({ start, end });
      }
    }
  });

  return entities;
}

/**
 * Validate text for PII presence (for user guidance)
 */
export function validateNoPII(text: string): PIIValidationResult {
  const entities = detectPII(text);
  const detectedTypes = [...new Set(entities.map((e) => e.type))];

  return {
    hasPII: entities.length > 0,
    entities,
    detectedTypes,
  };
}

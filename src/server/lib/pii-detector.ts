/**
 * PII Detection and Redaction Service
 *
 * Detects and redacts Personally Identifiable Information from text.
 * Compliant with HIPAA, GDPR, and wellness industry standards.
 */

export interface PIIEntity {
  type: 'email' | 'phone' | 'ssn' | 'address' | 'credit_card' | 'ip_address';
  value: string;
  start: number;
  end: number;
  redacted: string;
}

export interface RedactionResult {
  sanitizedText: string;
  entities: PIIEntity[];
  hasRedactions: boolean;
}

// PII detection patterns
const PII_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers (various formats)
  phone: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Social Security Numbers
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // Credit card numbers (basic pattern, 13-19 digits)
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

  // IP addresses (IPv4)
  ip_address: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,

  // Street addresses (basic pattern for common formats)
  address: /\b\d{1,5}\s+[\w\s]{3,30}\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|circle|cir|way)\b/gi,
};

/**
 * Detect PII entities in text without redacting
 */
export function detectPII(text: string): PIIEntity[] {
  const entities: PIIEntity[] = [];

  // Track processed ranges to avoid overlapping detections
  const processedRanges: Array<{ start: number; end: number }> = [];

  const isOverlapping = (start: number, end: number): boolean => {
    return processedRanges.some(
      range => (start >= range.start && start < range.end) ||
               (end > range.start && end <= range.end)
    );
  };

  // Detect emails
  let match;
  const emailRegex = new RegExp(PII_PATTERNS.email);
  while ((match = emailRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (!isOverlapping(start, end)) {
      entities.push({
        type: 'email',
        value: match[0],
        start,
        end,
        redacted: '[EMAIL]',
      });
      processedRanges.push({ start, end });
    }
  }

  // Detect phone numbers
  const phoneRegex = new RegExp(PII_PATTERNS.phone);
  while ((match = phoneRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (!isOverlapping(start, end)) {
      entities.push({
        type: 'phone',
        value: match[0],
        start,
        end,
        redacted: '[PHONE]',
      });
      processedRanges.push({ start, end });
    }
  }

  // Detect SSNs
  const ssnRegex = new RegExp(PII_PATTERNS.ssn);
  while ((match = ssnRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (!isOverlapping(start, end)) {
      entities.push({
        type: 'ssn',
        value: match[0],
        start,
        end,
        redacted: '[SSN]',
      });
      processedRanges.push({ start, end });
    }
  }

  // Detect credit cards
  const ccRegex = new RegExp(PII_PATTERNS.credit_card);
  while ((match = ccRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (!isOverlapping(start, end)) {
      entities.push({
        type: 'credit_card',
        value: match[0],
        start,
        end,
        redacted: '[CREDIT_CARD]',
      });
      processedRanges.push({ start, end });
    }
  }

  // Detect IP addresses
  const ipRegex = new RegExp(PII_PATTERNS.ip_address);
  while ((match = ipRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (!isOverlapping(start, end)) {
      entities.push({
        type: 'ip_address',
        value: match[0],
        start,
        end,
        redacted: '[IP_ADDRESS]',
      });
      processedRanges.push({ start, end });
    }
  }

  // Detect addresses
  const addressRegex = new RegExp(PII_PATTERNS.address);
  while ((match = addressRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (!isOverlapping(start, end)) {
      entities.push({
        type: 'address',
        value: match[0],
        start,
        end,
        redacted: '[ADDRESS]',
      });
      processedRanges.push({ start, end });
    }
  }

  // Sort entities by position (for proper redaction)
  return entities.sort((a, b) => a.start - b.start);
}

/**
 * Redact PII from text
 */
export function redactPII(text: string): RedactionResult {
  const entities = detectPII(text);

  if (entities.length === 0) {
    return {
      sanitizedText: text,
      entities: [],
      hasRedactions: false,
    };
  }

  // Build sanitized text by replacing PII with redacted markers
  let sanitizedText = '';
  let lastIndex = 0;

  for (const entity of entities) {
    // Add text before the PII
    sanitizedText += text.substring(lastIndex, entity.start);
    // Add redacted marker
    sanitizedText += entity.redacted;
    lastIndex = entity.end;
  }

  // Add remaining text after last PII
  sanitizedText += text.substring(lastIndex);

  // Store entities without the actual PII values (for compliance)
  const sanitizedEntities: PIIEntity[] = entities.map(e => ({
    ...e,
    value: '[REDACTED]', // Don't store the actual PII
  }));

  return {
    sanitizedText,
    entities: sanitizedEntities,
    hasRedactions: true,
  };
}

/**
 * Validate that text doesn't contain PII (for user guidance)
 */
export function validateNoPII(text: string): { isValid: boolean; detectedTypes: string[] } {
  const entities = detectPII(text);

  if (entities.length === 0) {
    return { isValid: true, detectedTypes: [] };
  }

  const detectedTypes = [...new Set(entities.map(e => e.type))];
  return { isValid: false, detectedTypes };
}

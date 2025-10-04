/**
 * Client-side PII validation (for user warnings)
 *
 * This is a lightweight version for browser use.
 * Actual redaction happens server-side.
 */

export function detectPIIClient(text: string): { hasPII: boolean; types: string[] } {
  const patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    phone: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  };

  const detected: string[] = [];

  if (patterns.email.test(text)) detected.push('email');
  if (patterns.phone.test(text)) detected.push('phone');
  if (patterns.ssn.test(text)) detected.push('SSN');

  return {
    hasPII: detected.length > 0,
    types: detected,
  };
}

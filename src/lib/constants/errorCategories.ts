/**
 * Simplified Error Category Constants
 *
 * Reduced to 4 basic types for minimal complexity
 */

export const ERROR_CATEGORIES = {
  AUTH: "auth",
  NETWORK: "network",
  VALIDATION: "validation",
  SYSTEM: "system",
} as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[keyof typeof ERROR_CATEGORIES];

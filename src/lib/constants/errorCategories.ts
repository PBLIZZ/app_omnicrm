/**
 * Error category constants
 */

export const ERROR_CATEGORIES = {
  AUTH: "auth",
  RATE_LIMIT: "rate_limit",
  NETWORK: "network",
  SYSTEM: "system",
  DATA_FORMAT: "data_format",
  PROCESSING: "processing",
  PERMISSION: "permission",
  CONFIGURATION: "configuration",
} as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[keyof typeof ERROR_CATEGORIES];

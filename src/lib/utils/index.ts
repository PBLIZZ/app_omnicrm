// Main utils exports
export * from "./cn";
export * from "./auth";
export * from "./encoding";

// Data transformation utilities
export * from "./data-transforms";
export * from "./string-helpers";

// Error handling utilities
export * from "./error-handler";

// Type guards and validation utilities
export * from "./type-guards";

// Result type and functional error handling
// Note: result.ts also exports ValidationResult and validationError which conflict with type-guards
// Exporting only the functions and types that don't conflict
export type { Result, DbResult, ApiResult } from "./result";
export {
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  flatMap,
  unwrap,
  unwrapOr,
  safe,
  safeAsync,
  all,
  any,
  dbError,
  apiError,
} from "./result";
// Note: validationError from result.ts conflicts with type-guards, import directly if needed

// Safe Zod parsing and validation helpers
export * from "./zod-helpers";

// Date/timestamp conversion helpers - using date-helpers (newer, Result-based API)
export * from "./date-helpers";
// Legacy dateUtils.ts moved to deprecated-utils/ folder

// API boundary types and interfaces
export * from "./api-types";

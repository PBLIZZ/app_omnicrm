// Main utils exports
export * from "./cn";
export * from "./auth";
export * from "./encoding";

// Data transformation utilities
export * from "./data-transforms";
export * from "./string-helpers";

// Type guards and validation utilities
export * from "./type-guards";

// Safe Zod parsing and validation helpers
export * from "./zod-helpers";

// Date/timestamp conversion helpers - using date-helpers (newer, Result-based API)
export * from "./date-helpers";
// Legacy dateUtils.ts moved to deprecated-utils/ folder

// Date/timestamp conversion helpers - DEPRECATED
// Date/timestamp conversion helpers - DEPRECATED
// date-helpers.ts uses deprecated Result pattern
// Import directly if needed
// API boundary types and interfaces
export * from "./api-types";

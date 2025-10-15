// Main utils exports
export * from "./cn";
export * from "./auth";
export * from "./encoding";

// Data transformation utilities
export * from "./data-transforms";
export * from "./string-helpers";

// Type guards and validation utilities
export * from "./type-guards";

// Result type and functional error handling - DEPRECATED October 2025
// The result.ts file was removed during October 2025 refactoring
// New pattern: Services throw AppError directly, no Result<T> wrapper
// See docs/REFACTORING_PATTERNS_OCT_2025.md for current patterns

// Safe Zod parsing and validation helpers - DEPRECATED
// zod-helpers.ts uses deprecated Result pattern
// Import directly if needed, but prefer Zod's built-in safeParse()

// Date/timestamp conversion helpers - DEPRECATED
// Date/timestamp conversion helpers - DEPRECATED
// date-helpers.ts uses deprecated Result pattern
// Import directly if needed
// API boundary types and interfaces
export * from "./api-types";

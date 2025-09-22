// ============================================================================
// VALIDATION SCHEMAS INDEX - Centralized exports
// ============================================================================
//
// Data types sourced from server/db/schema.ts (canonical database schema)
// All types inferred from Zod schemas - aligned with simplified OkEnvelope/ErrorEnvelope pattern

// ============================================================================
// HTTP & API RESPONSE PATTERNS (ELIMINATED - Use direct patterns)
// ============================================================================
// Former http.ts exports eliminated - use direct { ok, data } | { ok, error } patterns

// ============================================================================
// CORE BUSINESS ENTITIES
// ============================================================================
export * from "./contacts";
export * from "./notes";
export * from "./calendar";
export * from "./tasks";

// ============================================================================
// AI & INTELLIGENCE
// ============================================================================
export * from "./insights.dto";
export * from "./interactions.dto";
export * from "./embeddings.dto";

// ============================================================================
// CHAT & MESSAGING
// ============================================================================
export * from "./chat";

// ============================================================================
// SYNC & INTEGRATIONS
// ============================================================================
export * from "./sync";
export * from "./drive";
export * from "./raw-events";

// ============================================================================
// LEGACY & COMPATIBILITY (DEPRECATED - To be removed)
// ============================================================================
// Note: These exports are maintained for backward compatibility only
// New code should use the updated schemas above
export * from "./omniClients"; // Legacy - use contacts.ts instead
export * from "./enhanced-examples"; // Legacy examples

/**
 * JSONB Validation and Sanitization Helpers
 *
 * Provides safe validation and sanitization for JSONB fields to prevent
 * sensitive data exposure and ensure type safety at the schema boundary.
 *
 * Per architecture blueprint: JSONB fields should not be exposed as z.unknown()
 * without validation. Use these helpers to create scoped, validated schemas.
 */

import { z } from "zod";

// ============================================================================
// CONTACT JSONB SCHEMAS
// ============================================================================

/**
 * Contact Address Schema
 * Validates address JSONB field structure
 */
export const ContactAddressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .strict()
  .optional();

export type ContactAddress = z.infer<typeof ContactAddressSchema>;

/**
 * Contact Health Context Schema
 * Validates healthContext JSONB field - contains sensitive PII
 */
export const ContactHealthContextSchema = z
  .object({
    conditions: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .strict()
  .optional();

export type ContactHealthContext = z.infer<typeof ContactHealthContextSchema>;

/**
 * Contact Preferences Schema
 * Validates preferences JSONB field
 */
export const ContactPreferencesSchema = z
  .object({
    communicationMethod: z.enum(["email", "phone", "sms", "any"]).optional(),
    preferredTime: z.string().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    marketingOptIn: z.boolean().optional(),
  })
  .strict()
  .optional();

export type ContactPreferences = z.infer<typeof ContactPreferencesSchema>;

// ============================================================================
// CONTACT DETAILS SCHEMA
// ============================================================================

/**
 * Contact Details Schema
 * Validates contacts.details JSONB field with unknown input handling
 */
export const ContactDetailsSchema = z
  .object({
    description: z.string().optional(),
    notes: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.unknown()); // Allow extra fields

export type ContactDetails = z.infer<typeof ContactDetailsSchema>;

// ============================================================================
// TASK DETAILS SCHEMA
// ============================================================================

/**
 * Task Details Schema
 * Validates tasks.details JSONB field with unknown input handling
 */
export const TaskDetailsSchema = z
  .object({
    description: z.string().optional(),
    notes: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    estimatedDuration: z.number().optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.unknown()); // Allow extra fields

export type TaskDetails = z.infer<typeof TaskDetailsSchema>;

// ============================================================================
// PROJECT DETAILS SCHEMA
// ============================================================================

/**
 * Project Details Schema
 * Validates projects.details JSONB field with unknown input handling
 */
export const ProjectDetailsSchema = z
  .object({
    description: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    status: z.enum(["planning", "active", "on-hold", "completed", "cancelled"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    budget: z.number().optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.unknown()); // Allow extra fields

export type ProjectDetails = z.infer<typeof ProjectDetailsSchema>;

// ============================================================================
// LEGACY SCHEMAS (for backward compatibility)
// ============================================================================

/**
 * Task/Project Details Schema
 * Validates generic details JSONB field
 */
export const EntityDetailsSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Safe transformation for nullable details to empty object
 */
export const NullableEntityDetailsSchema = z
  .union([z.record(z.string(), z.unknown()), z.null(), z.undefined()])
  .transform((value) => (value == null ? {} : value));

// ============================================================================
// AI INSIGHT CONTENT SCHEMAS
// ============================================================================

/**
 * AI Insight Content Schema (String or Object)
 * Validates AI-generated content which can be string or structured object
 */
export const AiInsightContentSchema = z.union([z.string(), z.record(z.string(), z.unknown())]);

export type AiInsightContent = z.infer<typeof AiInsightContentSchema>;

// ============================================================================
// SOURCE METADATA & RAW EVENT PAYLOAD SCHEMAS
// ============================================================================

/**
 * DEPRECATED: These schemas have been moved to @/server/db/business-schemas/raw-events-payloads
 *
 * Use the schemas from raw-events-payloads.ts instead - they are the single source of truth
 * for all JSONB payload and source_meta structures based on the actual database schema.
 *
 * Temporary re-exports are provided below for backward compatibility during migration.
 * Update your imports to the new location and remove these re-exports once all consumers are migrated.
 *
 * Migration example:
 * - OLD: import { GmailSourceMetaSchema } from "@/lib/validation/jsonb"
 * - NEW: import { GmailSourceMetaSchema } from "@/server/db/business-schemas/raw-events-payloads"
 */

// Deprecated re-exports for migration - forward to new location
export {
  GmailSourceMetaSchema,
  CalendarSourceMetaSchema,
  GmailMessagePayloadSchema,
  GoogleCalendarEventPayloadSchema,
  RawEventPayloadSchema,
  RawEventSourceMetaSchema as SourceMetaSchema,
} from "@/server/db/business-schemas/raw-events-payloads";

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

/**
 * Redacts sensitive fields from JSONB objects before exposure
 */
export function redactSensitiveFields<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: string[],
): T {
  const redacted = { ...data } as T;
  for (const field of sensitiveFields) {
    if (field in redacted) {
      (redacted as Record<string, unknown>)[field] = "[REDACTED]";
    }
  }
  return redacted;
}

/**
 * Validates and sanitizes contact health context
 * Redacts sensitive fields for non-admin users
 */
export function sanitizeHealthContext(
  healthContext: unknown,
  includeFullDetails = false,
): ContactHealthContext | undefined {
  if (!healthContext) return undefined;

  const parsed = ContactHealthContextSchema.parse(healthContext);
  if (!includeFullDetails && parsed) {
    // Redact sensitive details for non-admin contexts
    return {
      ...parsed,
      medications: parsed.medications ? ["[REDACTED]"] : undefined,
      notes: parsed.notes ? "[REDACTED]" : undefined,
    };
  }

  return parsed;
}

/**
 * Safe JSONB parsing with schema validation
 * Takes unknown JSONB data, validates against schema, returns validated data or safe default
 * Does NOT throw - always returns a safe value
 */
export function safeParseJsonb<T>(data: unknown, schema: z.ZodSchema<T>): T {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return result.data;
    }

    // If validation fails, return empty default based on schema type
    if (schema instanceof z.ZodObject) {
      return {} as T;
    }
    if (schema instanceof z.ZodArray) {
      return [] as T;
    }
    if (schema instanceof z.ZodRecord) {
      return {} as T;
    }

    // Fallback to null/undefined for other types
    return null as T;
  } catch {
    // If parsing completely fails, return safe default
    return null as T;
  }
}

/**
 * Sanitizes unknown JSONB data to safe object
 * Removes dangerous keys and ensures safe structure
 * Returns Record<string, unknown> or empty object
 */
export function sanitizeJsonb(data: unknown): Record<string, unknown> {
  try {
    // Handle null/undefined
    if (data == null) {
      return {};
    }

    // Handle non-objects
    if (typeof data !== "object") {
      return {};
    }

    // Handle arrays (convert to object with numeric keys)
    if (Array.isArray(data)) {
      const result: Record<string, unknown> = {};
      data.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          result[index.toString()] = sanitizeJsonb(item);
        } else {
          result[index.toString()] = item;
        }
      });
      return result;
    }

    // Handle objects
    const result: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      // Skip dangerous keys that could cause prototype pollution
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof value === "object" && value !== null) {
        result[key] = sanitizeJsonb(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  } catch {
    // If sanitization fails, return empty object
    return {};
  }
}

/**
 * Legacy safeParseJsonb function (for backward compatibility)
 * @deprecated Use the new safeParseJsonb function with proper typing
 */
export function safeParseJsonbLegacy<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): z.infer<T> | null {
  try {
    // Parse and validate
    return schema.parse(data);
  } catch {
    // Invalid JSONB structure
    return null;
  }
}

import { z } from "zod";

// ============================================================================
// CORE CONTACT SCHEMAS
// ============================================================================

/**
 * Wellness Stage Enum
 *
 * Client lifecycle stages for wellness businesses
 */
export const WellnessStageEnum = z.enum([
  "Prospect",
  "New Client",
  "Core Client",
  "Referring Client",
  "VIP Client",
  "Lost Client",
  "At Risk Client",
]);

/**
 * Contact Source Enum
 *
 * Sources for contact data ingestion
 */
export const ContactSourceEnum = z.enum([
  "gmail_import",
  "manual",
  "upload",
  "calendar_import",
  "onboarding_form",
]);

/**
 * Wellness Tag Schema
 *
 * Structured wellness business tags with categories
 */
export const WellnessTagSchema = z.object({
  category: z.enum(["services", "demographics", "goals_health", "engagement_patterns"]),
  tag: z.string(),
});

/**
 * Contact DTO Schema
 *
 * Stable UI-focused contract for contact data.
 * Consolidated from validation schemas with enhanced typing.
 */
export const ContactDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  primaryEmail: z.string().email().nullable(),
  primaryPhone: z.string().nullable(),
  photoUrl: z.string().nullable(),
  source: ContactSourceEnum.nullable(),
  lifecycleStage: WellnessStageEnum.nullable(),
  tags: z.array(WellnessTagSchema).nullable(),
  confidenceScore: z
    .preprocess(
      (val) => {
        if (typeof val === "string") {
          const num = Number(val);
          return isNaN(num) ? val : num;
        }
        return val;
      },
      z
        .number()
        .min(0)
        .max(1)
        .transform((n) => n.toString()),
    )
    .nullable(), // AI confidence as validated string (0.0-1.0)
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ContactDTO = z.infer<typeof ContactDTOSchema>;

/**
 * Normalizes a tag to the structured WellnessTag format
 * Converts string tags to WellnessTag objects for backward compatibility
 */
export function normalizeTag(tag: string | WellnessTag): WellnessTag {
  if (typeof tag === "string") {
    return {
      name: tag,
      category: "goals_health", // Default to a valid category
      confidence: "0.8", // Default confidence for string tags
    };
  }
  return tag;
}

/**
 * Contact Creation DTO Schema
 *
 * Schema for creating new contacts with comprehensive validation
 */
export const CreateContactDTOSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(255, "Display name too long"),
  primaryEmail: z.string().email("Invalid email format").nullable().optional(),
  primaryPhone: z.string().max(50, "Phone number too long").nullable().optional(),
  photoUrl: z.string().url("Invalid photo URL").nullable().optional(),
  source: ContactSourceEnum.nullable().optional(),
  lifecycleStage: WellnessStageEnum.nullable().optional(),
  tags: z
    .array(z.union([z.string(), WellnessTagSchema]))
    .nullable()
    .optional(),
  confidenceScore: z
    .string()
    .regex(/^0(\.\d+)?$|^1(\.0)?$/, "Invalid confidence score format")
    .nullable()
    .optional(),
});

export type CreateContactDTO = z.infer<typeof CreateContactDTOSchema>;

/**
 * Contact Update DTO Schema
 *
 * Schema for updating existing contacts (all fields optional)
 */
export const UpdateContactDTOSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(255, "Display name too long")
    .optional(),
  primaryEmail: z.string().email("Invalid email format").nullable().optional(),
  primaryPhone: z.string().max(50, "Phone number too long").nullable().optional(),
  source: ContactSourceEnum.nullable().optional(),
  lifecycleStage: WellnessStageEnum.nullable().optional(),
  tags: z
    .array(z.union([z.string(), WellnessTagSchema]))
    .nullable()
    .optional(),
  confidenceScore: z
    .string()
    .regex(/^0(\.\d+)?$|^1(\.0)?$/, "Invalid confidence score format")
    .nullable()
    .optional(),
});

export type UpdateContactDTO = z.infer<typeof UpdateContactDTOSchema>;

// ============================================================================
// CONTACT IDENTITIES
// ============================================================================

/**
 * Contact Identity DTO Schema
 *
 * Represents additional contact identities (emails, phones, social accounts)
 */
export const ContactIdentityDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid(),
  kind: z.enum(["email", "phone", "social"]),
  value: z.string(),
  provider: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type ContactIdentityDTO = z.infer<typeof ContactIdentityDTOSchema>;

/**
 * Create Contact Identity Schema
 */
export const CreateContactIdentityDTOSchema = z.object({
  contactId: z.string().uuid(),
  kind: z.string().min(1, "Identity kind is required"),
  value: z.string().min(1, "Identity value is required").max(255, "Identity value too long"),
  provider: z.string().optional(),
});

export type CreateContactIdentityDTO = z.infer<typeof CreateContactIdentityDTOSchema>;

/**
 * Update Contact Identity Schema
 */
export const UpdateContactIdentityDTOSchema = z.object({
  kind: z.string().min(1, "Identity kind is required").optional(),
  value: z
    .string()
    .min(1, "Identity value is required")
    .max(255, "Identity value too long")
    .optional(),
  provider: z.string().nullable().optional(),
});

export type UpdateContactIdentityDTO = z.infer<typeof UpdateContactIdentityDTOSchema>;

// ============================================================================
// CONTACT TIMELINE
// ============================================================================

/**
 * Contact Timeline DTO Schema
 *
 * Timeline events for contact engagement history
 */
export const ContactTimelineDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid(),
  eventType: z.string(), // class_attended, workshop_booked, appointment_scheduled
  title: z.string(),
  description: z.string().nullable(),
  eventData: z.record(z.unknown()).nullable(), // JSONB field - eventId, eventTitle, location, duration, etc.
  occurredAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export type ContactTimelineDTO = z.infer<typeof ContactTimelineDTOSchema>;

/**
 * Create Contact Timeline Schema
 */
export const CreateContactTimelineDTOSchema = z.object({
  contactId: z.string().uuid(),
  eventType: z.string().min(1, "Event type is required"),
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  description: z.string().max(2000, "Description too long").nullable().optional(),
  eventData: z.record(z.unknown()).nullable().optional(),
  occurredAt: z.coerce.date(),
});

export type CreateContactTimelineDTO = z.infer<typeof CreateContactTimelineDTOSchema>;

/**
 * Update Contact Timeline Schema
 */
export const UpdateContactTimelineDTOSchema = z.object({
  eventType: z.string().min(1, "Event type is required").optional(),
  title: z.string().min(1, "Title is required").max(500, "Title too long").optional(),
  description: z.string().max(2000, "Description too long").nullable().optional(),
  eventData: z.record(z.unknown()).nullable().optional(),
  occurredAt: z.coerce.date().optional(),
});

export type UpdateContactTimelineDTO = z.infer<typeof UpdateContactTimelineDTOSchema>;

// ============================================================================
// EXTENDED SCHEMAS
// ============================================================================

/**
 * Contact with Notes DTO Schema
 *
 * Extended contact DTO that includes associated notes
 */
export const ContactWithNotesDTOSchema = ContactDTOSchema.extend({
  notes: z.array(
    z.object({
      id: z.string().uuid(),
      userId: z.string().uuid(),
      contactId: z.string().uuid().nullable(),
      title: z.string().nullable(),
      content: z.string(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
    }),
  ),
});

export type ContactWithNotesDTO = z.infer<typeof ContactWithNotesDTOSchema>;

/**
 * Contact Query Schema
 *
 * Schema for contact filtering and pagination
 */
export const ContactQueryDTOSchema = z.object({
  search: z.string().optional(), // Search in display name, email, phone
  source: ContactSourceEnum.optional(),
  lifecycleStage: WellnessStageEnum.optional(),
  tags: z.array(z.string()).optional(), // Filter by tags
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(["displayName", "createdAt", "updatedAt"]).default("displayName"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type ContactQueryDTO = z.infer<typeof ContactQueryDTOSchema>;

/**
 * Contact Suggestion Schema
 *
 * Schema for AI-generated contact suggestions from calendar analysis
 */
export const ContactSuggestionDTOSchema = z.object({
  email: z.string().email(),
  displayName: z.string(),
  source: z.literal("calendar_import"),
  confidence: z.number().min(0).max(1),
  eventCount: z.number().int().min(1),
  firstEventDate: z.coerce.date(),
  lastEventDate: z.coerce.date(),
  eventTypes: z.array(z.string()),
});

export type ContactSuggestionDTO = z.infer<typeof ContactSuggestionDTOSchema>;

/**
 * Bulk Create Contacts Schema
 *
 * Schema for bulk contact creation from suggestions
 */
export const BulkCreateContactsDTOSchema = z.object({
  contacts: z.array(CreateContactDTOSchema),
});

export type BulkCreateContactsDTO = z.infer<typeof BulkCreateContactsDTOSchema>;

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type WellnessStage = z.infer<typeof WellnessStageEnum>;
export type ContactSource = z.infer<typeof ContactSourceEnum>;
export type WellnessTag = z.infer<typeof WellnessTagSchema>;

// ============================================================================
// CONTACTS DTO SCHEMAS - Aligned with database schema
// ============================================================================

import { z } from "zod";

// ============================================================================
// CONTACTS SCHEMAS
// ============================================================================

// Full contact schema (mirrors contacts table structure exactly)
export const ContactSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  primaryEmail: z.string().nullable(),
  primaryPhone: z.string().nullable(),
  source: z.string().nullable(), // gmail_import | manual | upload | calendar_import
  stage: z.string().nullable(), // Prospect | New Client | Core Client | etc.
  tags: z.array(z.unknown()).nullable(), // JSONB array field - wellness segmentation tags array
  confidenceScore: z.string().nullable(), // AI insight confidence stored as text
  slug: z.string().nullable(), // SEO-friendly URL slug
  createdAt: z.string().datetime(), // timestamp without timezone
  updatedAt: z.string().datetime(), // timestamp without timezone
});

// Schema for creating new contacts
export const CreateContactSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(255, "Display name too long"),
  primaryEmail: z.string().email("Invalid email format").nullable().optional(),
  primaryPhone: z.string().max(50, "Phone number too long").nullable().optional(),
  source: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  tags: z.array(z.unknown()).nullable().optional(), // JSONB array field
  confidenceScore: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
});

// Schema for updating existing contacts
export const UpdateContactSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(255, "Display name too long").optional(),
  primaryEmail: z.string().email("Invalid email format").nullable().optional(),
  primaryPhone: z.string().max(50, "Phone number too long").nullable().optional(),
  source: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  tags: z.array(z.unknown()).nullable().optional(), // JSONB array field
  confidenceScore: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
});

// Schema for contact queries/filters
export const ContactQuerySchema = z.object({
  search: z.string().optional(), // Search in display name, email, phone
  source: z.string().optional(),
  stage: z.string().optional(),
  tags: z.array(z.string()).optional(), // Filter by tags
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(["displayName", "createdAt", "updatedAt"]).default("displayName"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ============================================================================
// CONTACT IDENTITIES SCHEMAS
// ============================================================================

// Full contact identity schema (mirrors contact_identities table structure exactly)
export const ContactIdentitySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid(),
  kind: z.string(), // email | phone | social | etc
  value: z.string(), // the actual email/phone/username value
  provider: z.string().nullable(), // optional provider (google, etc)
  createdAt: z.string().datetime(), // timestamp with timezone (from Drizzle schema)
});

// Schema for creating new contact identities
export const CreateContactIdentitySchema = z.object({
  contactId: z.string().uuid(),
  kind: z.string().min(1, "Identity kind is required"),
  value: z.string().min(1, "Identity value is required").max(255, "Identity value too long"),
  provider: z.string().optional(),
});

// Schema for updating existing contact identities
export const UpdateContactIdentitySchema = z.object({
  kind: z.string().min(1, "Identity kind is required").optional(),
  value: z.string().min(1, "Identity value is required").max(255, "Identity value too long").optional(),
  provider: z.string().nullable().optional(),
});

// ============================================================================
// CONTACT TIMELINE SCHEMAS
// ============================================================================

// Full contact timeline schema (mirrors contact_timeline table structure exactly)
export const ContactTimelineSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid(),
  eventType: z.string(), // class_attended, workshop_booked, appointment_scheduled
  title: z.string(),
  description: z.string().nullable(),
  eventData: z.record(z.unknown()).nullable(), // JSONB object field - eventId, eventTitle, location, duration, etc.
  occurredAt: z.string().datetime(), // timestamp with timezone
  createdAt: z.string().datetime(), // timestamp with timezone
});

// Schema for creating new contact timeline events
export const CreateContactTimelineSchema = z.object({
  contactId: z.string().uuid(),
  eventType: z.string().min(1, "Event type is required"),
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  description: z.string().max(2000, "Description too long").nullable().optional(),
  eventData: z.record(z.unknown()).nullable().optional(), // JSONB object field
  occurredAt: z.string().datetime(),
});

// Schema for updating existing contact timeline events
export const UpdateContactTimelineSchema = z.object({
  eventType: z.string().min(1, "Event type is required").optional(),
  title: z.string().min(1, "Title is required").max(500, "Title too long").optional(),
  description: z.string().max(2000, "Description too long").nullable().optional(),
  eventData: z.record(z.unknown()).nullable().optional(), // JSONB object field
  occurredAt: z.string().datetime().optional(),
});

// ============================================================================
// CONTACT SUGGESTION SCHEMAS
// ============================================================================

// Schema for contact suggestions from calendar analysis
export const ContactSuggestionSchema = z.object({
  email: z.string().email(),
  displayName: z.string(),
  source: z.string(), // calendar_import
  confidence: z.number().min(0).max(1),
  eventCount: z.number().int().min(1),
  firstEventDate: z.string().datetime(),
  lastEventDate: z.string().datetime(),
  eventTypes: z.array(z.string()), // Array of event types
});

// Schema for bulk contact creation from suggestions
export const BulkCreateContactsSchema = z.object({
  contacts: z.array(CreateContactSchema),
});

// ============================================================================
// WELLNESS CONTACT ENHANCEMENTS
// ============================================================================

// Wellness stage enum for contacts
export const WellnessStageEnum = z.enum([
  "Prospect",
  "New Client",
  "Core Client",
  "Referring Client",
  "VIP Client",
  "Lost Client",
  "At Risk Client",
]);

// Wellness tag categories
export const WellnessTagSchema = z.object({
  category: z.enum(["services", "demographics", "goals_health", "engagement_patterns"]),
  tag: z.string(),
});

// Enhanced contact schema with wellness-specific validations
export const WellnessContactSchema = ContactSchema.extend({
  stage: WellnessStageEnum.nullable(),
  tags: z.array(WellnessTagSchema).nullable(),
  confidenceScore: z.string().regex(/^0\.\d+$|^1\.0$/, "Invalid confidence score format").nullable(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Contact = z.infer<typeof ContactSchema>;
export type CreateContact = z.infer<typeof CreateContactSchema>;
export type UpdateContact = z.infer<typeof UpdateContactSchema>;
export type ContactQuery = z.infer<typeof ContactQuerySchema>;

export type ContactIdentity = z.infer<typeof ContactIdentitySchema>;
export type CreateContactIdentity = z.infer<typeof CreateContactIdentitySchema>;
export type UpdateContactIdentity = z.infer<typeof UpdateContactIdentitySchema>;

export type ContactTimeline = z.infer<typeof ContactTimelineSchema>;
export type CreateContactTimeline = z.infer<typeof CreateContactTimelineSchema>;
export type UpdateContactTimeline = z.infer<typeof UpdateContactTimelineSchema>;

export type ContactSuggestion = z.infer<typeof ContactSuggestionSchema>;
export type BulkCreateContacts = z.infer<typeof BulkCreateContactsSchema>;

export type WellnessContact = z.infer<typeof WellnessContactSchema>;
export type WellnessStage = z.infer<typeof WellnessStageEnum>;
export type WellnessTag = z.infer<typeof WellnessTagSchema>;
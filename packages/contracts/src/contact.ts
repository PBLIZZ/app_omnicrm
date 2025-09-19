import { z } from "zod";

/**
 * Contact DTO Schema
 *
 * Stable UI-focused contract for contact data.
 * Only includes fields actively used by frontend components.
 */
export const ContactDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  primaryEmail: z.string().email().nullable(),
  primaryPhone: z.string().nullable(),
  source: z.enum(["gmail_import", "manual", "upload", "calendar_import"]).nullable(),
  stage: z.enum([
    "Prospect",
    "New Client",
    "Core Client",
    "Referring Client",
    "VIP Client",
    "Lost Client",
    "At Risk Client"
  ]).nullable(),
  tags: z.array(z.string()).nullable(),
  confidenceScore: z.string().nullable(), // AI confidence as string (0.0-1.0)
  slug: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ContactDTO = z.infer<typeof ContactDTOSchema>;

/**
 * Contact Identity DTO Schema
 *
 * Represents additional contact identities (emails, phones, social accounts)
 */
export const ContactIdentityDTOSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
  kind: z.enum(["email", "phone", "social"]),
  value: z.string(),
  provider: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type ContactIdentityDTO = z.infer<typeof ContactIdentityDTOSchema>;

/**
 * Contact Creation DTO Schema
 *
 * Schema for creating new contacts
 */
export const CreateContactDTOSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  primaryEmail: z.string().email().optional(),
  primaryPhone: z.string().optional(),
  source: z.enum(["gmail_import", "manual", "upload", "calendar_import"]).optional(),
  stage: z.enum([
    "Prospect",
    "New Client",
    "Core Client",
    "Referring Client",
    "VIP Client",
    "Lost Client",
    "At Risk Client"
  ]).optional(),
  tags: z.array(z.string()).optional(),
  confidenceScore: z.string().optional(), // AI confidence score as string (0.0-1.0)
  slug: z.string().optional(),
});

export type CreateContactDTO = z.infer<typeof CreateContactDTOSchema>;

/**
 * Contact Update DTO Schema
 *
 * Schema for updating existing contacts (all fields optional)
 */
export const UpdateContactDTOSchema = CreateContactDTOSchema.partial();

export type UpdateContactDTO = z.infer<typeof UpdateContactDTOSchema>;

/**
 * Contact with Notes DTO Schema
 *
 * Extended contact DTO that includes associated notes
 */
export const ContactWithNotesDTOSchema = ContactDTOSchema.extend({
  notes: z.array(z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    contactId: z.string().uuid().nullable(),
    title: z.string().nullable(),
    content: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })),
});

export type ContactWithNotesDTO = z.infer<typeof ContactWithNotesDTOSchema>;
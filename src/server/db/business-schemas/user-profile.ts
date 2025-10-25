import { z } from "zod";

/**
 * User Profile Business Schemas - Validation for practitioner profile data
 *
 * These schemas validate extended profile information used for external communications.
 * All fields are optional - practitioners can fill in what's relevant for their practice.
 */

/**
 * Schema for updating user profile
 * All fields optional to support partial updates
 */
export const UpdateUserProfileSchema = z.object({
  preferredName: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name must be 100 characters or less")
    .optional(),

  organizationName: z
    .string()
    .trim()
    .min(1, "Organization name cannot be empty")
    .max(100, "Organization name must be 100 characters or less")
    .optional(),

  profilePhotoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),

  bio: z
    .string()
    .trim()
    .max(500, "Bio must be 500 characters or less")
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .trim()
    .regex(/^[\d\s()+\-ext.]+$/, "Invalid phone number format")
    .max(30, "Phone must be 30 characters or less")
    .optional()
    .or(z.literal("")),

  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export type UpdateUserProfileBody = z.infer<typeof UpdateUserProfileSchema>;

/**
 * Schema for complete user profile response (from database)
 */
export const UserProfileSchema = z.object({
  userId: z.string().uuid(),
  preferredName: z.string().nullable(),
  organizationName: z.string().nullable(),
  profilePhotoUrl: z.string().nullable(),
  bio: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserProfileResponse = z.infer<typeof UserProfileSchema>;

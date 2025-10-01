/**
 * Onboarding Schemas
 *
 * Input/output validation for onboarding endpoints:
 * - Admin token generation and management
 * - Public onboarding form submission
 * - Access tracking and file upload for onboarding
 */

import { z } from "zod";

// ============================================================================
// ADMIN TOKEN MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Generate Token Request Schema
 */
export const GenerateTokenRequestSchema = z.object({
  hoursValid: z.number().int().min(1).max(168).default(72), // 1 hour to 1 week
  label: z.string().min(1, "Label is required").max(100, "Label too long").optional(),
});

/**
 * Generate Token Response Schema
 */
export const GenerateTokenResponseSchema = z.object({
  success: z.boolean(),
  token: z.string(),
  expiresAt: z.string(),
  label: z.string().optional(),
  message: z.string(),
});

/**
 * List Tokens Query Schema
 */
export const ListTokensQuerySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
});

/**
 * Token Info Schema
 */
export const TokenInfoSchema = z.object({
  id: z.string(),
  token: z.string(),
  label: z.string().optional(),
  expiresAt: z.string(),
  createdAt: z.string(),
  isActive: z.boolean(),
  usageCount: z.number(),
});

/**
 * List Tokens Response Schema
 */
export const ListTokensResponseSchema = z.object({
  tokens: z.array(TokenInfoSchema),
});

/**
 * Token ID Params Schema
 */
export const TokenIdParamsSchema = z.object({
  tokenId: z.string(),
});

/**
 * Delete Token Request Schema - No body for DELETE
 */
export const DeleteTokenRequestSchema = z.object({});

/**
 * Delete Token Response Schema
 */
export const DeleteTokenResponseSchema = z.object({
  message: z.string(),
});

// ============================================================================
// PUBLIC ONBOARDING SCHEMAS
// ============================================================================

/**
 * Track Access Request Schema
 */
export const TrackAccessRequestSchema = z.object({
  token: z.string(),
  action: z.enum(["page_view", "form_start", "form_submit"]),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Track Access Response Schema
 */
export const TrackAccessResponseSchema = z.object({
  message: z.string(),
});

/**
 * Signed Upload Request Schema
 */
export const SignedUploadRequestSchema = z.object({
  token: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  contentType: z.string(),
});

/**
 * Signed Upload Response Schema
 */
export const SignedUploadResponseSchema = z.object({
  uploadUrl: z.string(),
  filePath: z.string(),
  token: z.string(),
});

/**
 * Onboarding Form Submit Request Schema
 * Uses .nullish() to accept both null and undefined for optional fields
 * Uses .passthrough() on nested objects to allow extra fields and prevent strict validation errors
 */
export const OnboardingSubmitRequestSchema = z.object({
  token: z.string().min(1, "Token is required"),
  client: z.object({
    display_name: z.string().min(1, "Full name is required"),
    primary_email: z.string().email("Valid email is required"),
    primary_phone: z.string().nullish(),
    date_of_birth: z.string().nullish(),
    emergency_contact_name: z.string().nullish(),
    emergency_contact_phone: z.string().nullish(),
    referral_source: z.string().nullish(),
    address: z.object({
      line1: z.string().nullish(),
      line2: z.string().nullish(),
      city: z.string().nullish(),
      state: z.string().nullish(),
      postalCode: z.string().nullish(),
      country: z.string().nullish(),
    }).passthrough().nullish(),
    health_context: z.object({
      conditions: z.array(z.string()).nullish(),
      allergies: z.array(z.string()).nullish(),
      fitnessLevel: z.string().nullish(),
      stressLevel: z.string().nullish(),
      medications: z.array(z.string()).nullish(),
      notes: z.string().nullish(),
    }).passthrough().nullish(),
    preferences: z.object({
      sessionTimes: z.array(z.string()).nullish(),
      communicationPreference: z.enum(["email", "phone", "text"]).nullish(),
      reminderFrequency: z.enum(["none", "daily", "weekly", "monthly"]).nullish(),
      notes: z.string().nullish(),
    }).passthrough().nullish(),
  }).passthrough(),
  consent: z.object({
    consent_type: z.enum(["data_processing", "marketing", "hipaa", "photography"]).default("data_processing"),
    consent_text_version: z.string().default("v1.0"),
    granted: z.boolean().default(true),
    signature_svg: z.string().nullish(),
    signature_image_url: z.string().nullish(),
  }).passthrough(),
  photo_path: z.string().nullish(),
}).passthrough();

/**
 * Onboarding Form Submit Response Schema
 */
export const OnboardingSubmitResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    submissionId: z.string(),
    status: z.string(),
    message: z.string(),
  }).optional(),
  error: z.string().optional(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================


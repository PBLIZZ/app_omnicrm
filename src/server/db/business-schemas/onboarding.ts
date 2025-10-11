// ===== src/server/db/business-schemas/onboarding.ts =====
/**
 * Onboarding Business Schemas
 * Separated into three logical groups:
 * 1. Admin Token Management
 * 2. Public Form Submission
 * 3. Photo Upload
 */

import { z } from "zod";

// ============================================================================
// ADMIN - TOKEN MANAGEMENT
// ============================================================================

export const GenerateTokenRequestSchema = z.object({
  hoursValid: z.number().int().min(1).max(168).default(72),
  label: z.string().min(1).max(100).optional(),
});

export const GenerateTokenResponseSchema = z.object({
  success: z.boolean(),
  token: z.string(),
  expiresAt: z.string(),
  label: z.string().optional(),
  publicUrl: z.string(),
  message: z.string(),
});

export const TokenInfoSchema = z.object({
  id: z.string(),
  token: z.string(),
  label: z.string().optional(),
  expiresAt: z.string(),
  createdAt: z.string(),
  isActive: z.boolean(),
  usageCount: z.number(),
});

export const ListTokensQuerySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export const ListTokensResponseSchema = z.object({
  tokens: z.array(TokenInfoSchema),
});

export const TokenIdParamsSchema = z.object({
  tokenId: z.string().uuid(),
});

export const DeleteTokenResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================================================
// PUBLIC - PHOTO UPLOAD (Server-side optimization)
// ============================================================================

// Note: Request is FormData, not JSON - parsed in route, validated in service
export const PhotoUploadResponseSchema = z.object({
  success: z.boolean(),
  filePath: z.string(),
  fileSize: z.number(),
  originalSize: z.number(),
  message: z.string(),
});

// ============================================================================
// PUBLIC - FORM SUBMISSION
// ============================================================================

export const OnboardingSubmitRequestSchema = z.object({
  token: z.string().min(1),
  client: z
    .object({
      display_name: z.string().min(1),
      primary_email: z.string().email(),
      primary_phone: z.string().nullish(),
      date_of_birth: z.string().nullish(),
      emergency_contact_name: z.string().nullish(),
      emergency_contact_phone: z.string().nullish(),
      referral_source: z.string().nullish(),
      address: z
        .object({
          line1: z.string().nullish(),
          line2: z.string().nullish(),
          city: z.string().nullish(),
          state: z.string().nullish(),
          postalCode: z.string().nullish(),
          country: z.string().nullish(),
        })
        .passthrough()
        .nullish(),
      health_context: z
        .object({
          conditions: z.array(z.string()).nullish(),
          allergies: z.array(z.string()).nullish(),
          fitnessLevel: z.string().nullish(),
          stressLevel: z.string().nullish(),
          medications: z.array(z.string()).nullish(),
          notes: z.string().nullish(),
        })
        .passthrough()
        .nullish(),
      preferences: z
        .object({
          sessionTimes: z.array(z.string()).nullish(),
          communicationPreference: z.enum(["email", "phone", "text"]).nullish(),
          reminderFrequency: z.enum(["none", "daily", "weekly", "monthly"]).nullish(),
          notes: z.string().nullish(),
        })
        .passthrough()
        .nullish(),
    })
    .passthrough(),
  consent: z
    .object({
      consent_type: z
        .enum(["data_processing", "marketing", "hipaa", "photography"])
        .default("data_processing"),
      consent_text_version: z.string().default("v1.0"),
      granted: z.boolean().default(true),
      signature_svg: z.string().nullish(),
      signature_image_url: z.string().nullish(),
    })
    .passthrough(),
  photo_path: z.string().nullish(),
  photo_size: z.number().int().positive().nullish(),
});

export const OnboardingSubmitResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    contactId: z.string(),
    message: z.string(),
  }),
});

export const TrackAccessRequestSchema = z.object({
  token: z.string().min(1),
  action: z.enum(["page_view", "form_start", "form_submit"]).optional(),
});

export const TrackAccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type GenerateTokenRequest = z.infer<typeof GenerateTokenRequestSchema>;
export type GenerateTokenResponse = z.infer<typeof GenerateTokenResponseSchema>;
export type ListTokensResponse = z.infer<typeof ListTokensResponseSchema>;
export type PhotoUploadResponse = z.infer<typeof PhotoUploadResponseSchema>;
export type OnboardingSubmitRequest = z.infer<typeof OnboardingSubmitRequestSchema>;
export type OnboardingSubmitResponse = z.infer<typeof OnboardingSubmitResponseSchema>;
export type TrackAccessResponse = z.infer<typeof TrackAccessResponseSchema>;

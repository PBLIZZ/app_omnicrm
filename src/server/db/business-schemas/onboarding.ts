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
 * Onboarding Form Submit Request Schema (for FormData)
 * Note: The actual validation is done in the service layer since
 * this handles FormData which can't be pre-validated with Zod
 */
export const OnboardingSubmitRequestSchema = z.object({
  // This will be validated in the service layer from FormData
});

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

export type GenerateTokenRequest = z.infer<typeof GenerateTokenRequestSchema>;
export type GenerateTokenResponse = z.infer<typeof GenerateTokenResponseSchema>;
export type ListTokensQuery = z.infer<typeof ListTokensQuerySchema>;
export type ListTokensResponse = z.infer<typeof ListTokensResponseSchema>;
export type TokenIdParams = z.infer<typeof TokenIdParamsSchema>;
export type DeleteTokenRequest = z.infer<typeof DeleteTokenRequestSchema>;
export type DeleteTokenResponse = z.infer<typeof DeleteTokenResponseSchema>;
export type TrackAccessRequest = z.infer<typeof TrackAccessRequestSchema>;
export type TrackAccessResponse = z.infer<typeof TrackAccessResponseSchema>;
export type SignedUploadRequest = z.infer<typeof SignedUploadRequestSchema>;
export type SignedUploadResponse = z.infer<typeof SignedUploadResponseSchema>;
export type OnboardingSubmitRequest = z.infer<typeof OnboardingSubmitRequestSchema>;
export type OnboardingSubmitResponse = z.infer<typeof OnboardingSubmitResponseSchema>;
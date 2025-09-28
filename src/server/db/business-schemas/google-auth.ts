/**
 * Google OAuth-specific schemas
 *
 * Authentication and authorization schemas for Google services
 */

import { z } from "zod";

// ============================================================================
// GOOGLE OAUTH SCHEMAS
// ============================================================================

/**
 * OAuth Start Query Schema - Empty for OAuth start endpoints
 */
export const OAuthStartQuerySchema = z.object({});

export type OAuthStartQuery = z.infer<typeof OAuthStartQuerySchema>;

/**
 * Gmail OAuth Callback Query Schema
 */
export const GmailOAuthCallbackQuerySchema = z
  .object({
    code: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
  })
  .refine((data) => Boolean(data.code) !== Boolean(data.error), {
    message: "Exactly one of 'code' or 'error' must be present in OAuth callback",
  });

export type GmailOAuthCallbackQuery = z.infer<typeof GmailOAuthCallbackQuerySchema>;

/**
 * Gmail Status Query Schema - Empty for status check endpoints
 */
export const GmailStatusQuerySchema = z.object({});

export type GmailStatusQuery = z.infer<typeof GmailStatusQuerySchema>;

/**
 * Calendar OAuth Callback Query Schema
 */
export const CalendarOAuthCallbackQuerySchema = z
  .object({
    code: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
  })
  .refine((data) => Boolean(data.code) !== Boolean(data.error), {
    message: "Exactly one of 'code' or 'error' must be present in OAuth callback",
  });

export type CalendarOAuthCallbackQuery = z.infer<typeof CalendarOAuthCallbackQuerySchema>;

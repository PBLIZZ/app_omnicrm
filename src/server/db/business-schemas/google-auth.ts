/**
 * Google OAuth-specific schemas
 *
 * Centralized authentication and authorization schemas for all Google services.
 * This is the single source of truth for OAuth callback validation.
 *
 * Per architecture blueprint: OAuth callback schemas must enforce XOR constraint
 * (code vs error) and state integrity to prevent inconsistent validation.
 */

import { z } from "zod";

// ============================================================================
// SHARED OAUTH SCHEMAS
// ============================================================================

/**
 * OAuth Start Query Schema - Empty for OAuth start endpoints
 */
export const OAuthStartQuerySchema = z.object({});

/**
 * Shared OAuth Callback Query Schema with XOR Constraint
 *
 * Use this for ALL Google OAuth callback endpoints (Gmail, Calendar, Drive).
 * Enforces that exactly one of 'code' or 'error' must be present.
 */
export const GoogleOAuthCallbackQuerySchema = z
  .object({
    code: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
    error_description: z.string().optional(),
  })
  .refine((data) => Boolean(data.code) !== Boolean(data.error), {
    message: "Exactly one of 'code' or 'error' must be present in OAuth callback",
  })
  .refine((data) => data.state !== undefined, {
    message: "State parameter is required for OAuth callback validation",
  });

export type GoogleOAuthCallbackQuery = z.infer<typeof GoogleOAuthCallbackQuerySchema>;

// ============================================================================
// SERVICE-SPECIFIC ALIASES (for backwards compatibility)
// ============================================================================

/**
 * Gmail OAuth Callback Query Schema
 * @deprecated Use GoogleOAuthCallbackQuerySchema instead
 */
export const GmailOAuthCallbackQuerySchema = GoogleOAuthCallbackQuerySchema;
export type GmailOAuthCallbackQuery = GoogleOAuthCallbackQuery;

/**
 * Calendar OAuth Callback Query Schema
 * @deprecated Use GoogleOAuthCallbackQuerySchema instead
 */
export const CalendarOAuthCallbackQuerySchema = GoogleOAuthCallbackQuerySchema;
export type CalendarOAuthCallbackQuery = GoogleOAuthCallbackQuery;

/**
 * Gmail Status Query Schema - Empty for status check endpoints
 */
export const GmailStatusQuerySchema = z.object({});

/**
 * Calendar Status Query Schema - Empty for status check endpoints
 */
export const CalendarStatusQuerySchema = z.object({});


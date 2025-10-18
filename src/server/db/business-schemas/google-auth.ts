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
 * Google OAuth Callback Query Schema
 * Re-export from canonical oauth-validation.ts for consistency
 */
export {
  OAuthCallbackQuerySchema as GoogleOAuthCallbackQuerySchema,
  type OAuthCallbackQuery as GoogleOAuthCallbackQuery,
} from "@/server/lib/oauth-validation";

// Import for local use
import { OAuthCallbackQuerySchema, type OAuthCallbackQuery } from "@/server/lib/oauth-validation";

// ============================================================================
// SERVICE-SPECIFIC ALIASES (for backwards compatibility)
// ============================================================================

/**
 * Gmail OAuth Callback Query Schema
 * @deprecated Use GoogleOAuthCallbackQuerySchema instead
 */
export const GmailOAuthCallbackQuerySchema = OAuthCallbackQuerySchema;
export type GmailOAuthCallbackQuery = OAuthCallbackQuery;

/**
 * Calendar OAuth Callback Query Schema
 * @deprecated Use GoogleOAuthCallbackQuerySchema instead
 */
export const CalendarOAuthCallbackQuerySchema = OAuthCallbackQuerySchema;
export type CalendarOAuthCallbackQuery = OAuthCallbackQuery;

/**
 * Gmail Status Query Schema - Empty for status check endpoints
 */
export const GmailStatusQuerySchema = z.object({});

/**
 * Calendar Status Query Schema - Empty for status check endpoints
 */
export const CalendarStatusQuerySchema = z.object({});

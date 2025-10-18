/**
 * OAuth Business Schemas
 *
 * Schemas for OAuth flow validation and responses
 */

import { z } from "zod";

// OAuth callback query parameters - moved to oauth-validation.ts for comprehensive validation

// OAuth redirect response
export const OAuthRedirectResponseSchema = z.object({
  url: z.string().url(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

// OAuth connection status
export const OAuthConnectionStatusSchema = z.object({
  connected: z.boolean(),
  autoRefreshed: z.boolean().optional(),
  integration: z
    .object({
      service: z.string(),
      expiryDate: z.string().nullable(),
      hasRefreshToken: z.boolean(),
    })
    .nullable(),
  lastSync: z.string().nullable(),
});

// Google services status response
export const GoogleStatusResponseSchema = z.object({
  services: z.object({
    gmail: OAuthConnectionStatusSchema,
    calendar: OAuthConnectionStatusSchema,
  }),
  features: z.object({
    gmail: z.boolean(),
    calendar: z.boolean(),
  }),
  jobs: z.object({
    queued: z.number(),
    done: z.number(),
    error: z.number(),
  }),
  embedJobs: z.object({
    queued: z.number(),
    done: z.number(),
    error: z.number(),
  }),
  lastBatchId: z.string().nullable(),
});

// OAuth state validation
export const OAuthStateSchema = z.string().regex(/^[a-f0-9]{64}$/, "Invalid state format");

// OAuth scopes validation
export const OAuthScopesSchema = z.array(z.string().url());

// OAuth error response
export const OAuthErrorResponseSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});

// Type exports
export type OAuthRedirectResponse = z.infer<typeof OAuthRedirectResponseSchema>;
export type OAuthConnectionStatus = z.infer<typeof OAuthConnectionStatusSchema>;
export type GoogleStatusResponse = z.infer<typeof GoogleStatusResponseSchema>;
export type OAuthState = z.infer<typeof OAuthStateSchema>;
export type OAuthScopes = z.infer<typeof OAuthScopesSchema>;
export type OAuthErrorResponse = z.infer<typeof OAuthErrorResponseSchema>;

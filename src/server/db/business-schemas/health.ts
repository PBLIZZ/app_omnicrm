/**
 * Health Check Schemas
 *
 * Domain schemas for health check and system monitoring endpoints
 */

import { z } from "zod";

// =============================================================================
// Health Check Schemas
// =============================================================================

export const HealthResponseSchema = z.object({
  ts: z.string(),
  db: z.boolean().optional(),
});

// =============================================================================
// Database Ping Schemas
// =============================================================================

export const DbPingResponseSchema = z.object({
  status: z.literal("healthy"),
  timestamp: z.string(),
});

// =============================================================================
// Google Auth Schemas
// =============================================================================

export const GoogleSignInQuerySchema = z.object({
  redirectTo: z.string().optional(),
});

// =============================================================================
// Type Exports
// =============================================================================

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type DbPingResponse = z.infer<typeof DbPingResponseSchema>;
export type GoogleSignInQuery = z.infer<typeof GoogleSignInQuerySchema>;
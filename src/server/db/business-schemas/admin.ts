/**
 * Admin Operations Schemas
 *
 * Domain schemas for administrative operations and testing endpoints
 */

import { z } from "zod";

// =============================================================================
// Email Intelligence Schemas
// =============================================================================

export const EmailIntelligenceTriggerSchema = z.object({
  batchSize: z.number().int().min(1).max(1000).optional().default(100),
  dryRun: z.boolean().optional().default(false),
});

export const EmailIntelligenceResponseSchema = z.object({
  error: z.string(),
  timestamp: z.string(),
});

// =============================================================================
// Replay Operations Schemas
// =============================================================================

export const ReplayInputSchema = z.object({
  operation: z.enum(["events", "interactions", "insights"]).optional(),
  batchSize: z.number().int().min(1).max(1000).optional().default(100),
  dryRun: z.boolean().optional().default(false),
});

export const ReplayResponseSchema = z.object({
  error: z.string(),
  timestamp: z.string(),
});

// =============================================================================
// Dashboard Schemas
// =============================================================================

export const DashboardQuerySchema = z.object({
  // Add any query parameters if needed
});

export const DashboardResponseSchema = z.object({
  gmail: z.object({
    isConnected: z.boolean(),
    status: z.string(),
    lastSync: z.string().nullable(),
  }),
  calendar: z.object({
    isConnected: z.boolean(),
    status: z.string(),
    lastSync: z.string().nullable(),
  }),
  jobs: z.object({
    pending: z.number(),
    processing: z.number(),
    failed: z.number(),
  }),
  timestamp: z.string(),
});

// =============================================================================
// Type Exports
// =============================================================================

export type EmailIntelligenceResponse = z.infer<typeof EmailIntelligenceResponseSchema>;

export type ReplayResponse = z.infer<typeof ReplayResponseSchema>;

export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
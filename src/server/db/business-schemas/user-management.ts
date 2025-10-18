/**
 * User Management Schemas
 *
 * Input/output validation for user management endpoints:
 * - User data export (GDPR compliance)
 * - User account deletion (GDPR compliance)
 */

import { z } from "zod";

// ============================================================================
// USER EXPORT SCHEMAS
// ============================================================================

/**
 * User Export Request Schema
 * For GET /api/user/export - No body, just auth required
 */
export const UserExportRequestSchema = z.object({});

/**
 * User Export Summary Schema
 */
export const UserExportSummarySchema = z.object({
  totalContacts: z.number(),
  totalInteractions: z.number(),
  totalAiInsights: z.number(),
  totalThreads: z.number(),
  totalMessages: z.number(),
  totalDocuments: z.number(),
  exportCompleteness: z.literal("partial"),
  privacyNote: z.string(),
});

/**
 * User Export Compliance Schema
 */
export const UserExportComplianceSchema = z.object({
  gdprCompliant: z.boolean(),
  dataController: z.string(),
  retentionPolicy: z.string(),
  deletionRights: z.string(),
  portabilityRights: z.string(),
});

/**
 * User Export Data Wrapper Schema
 */
export const UserExportDataWrapperSchema = z.object({
  items: z.array(z.unknown()),
  note: z.string(),
});

/**
 * User Export Response Schema
 */
export const UserExportResponseSchema = z.object({
  exportedAt: z.string(),
  version: z.number(),
  userId: z.string(),

  // Core data
  contacts: z.array(z.unknown()),
  interactions: UserExportDataWrapperSchema,

  // AI data
  aiInsights: z.array(z.unknown()),
  aiUsage: UserExportDataWrapperSchema,
  aiQuotas: z.array(z.unknown()),

  // Chat/conversation data
  threads: z.array(z.unknown()),
  messages: UserExportDataWrapperSchema,
  toolInvocations: z.array(z.unknown()),

  // Documents and embeddings
  documents: z.array(z.unknown()),
  embeddings: UserExportDataWrapperSchema,

  // System data
  syncPreferences: z.array(z.unknown()),
  syncAuditLog: UserExportDataWrapperSchema,
  rawEvents: UserExportDataWrapperSchema,
  jobs: UserExportDataWrapperSchema,

  // Summary and compliance
  summary: UserExportSummarySchema,
  compliance: UserExportComplianceSchema,
});

// ============================================================================
// USER DELETION SCHEMAS
// ============================================================================

/**
 * User Deletion Request Schema
 */
export const UserDeletionRequestSchema = z.object({
  confirmation: z.literal("DELETE MY DATA"),
  acknowledgeIrreversible: z.literal(true),
});

/**
 * User Deletion Response Schema
 */
export const UserDeletionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedAt: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * User Deletion Preview Schema
 */
export const UserDeletionPreviewSchema = z.object({
  contacts: z.number(),
  interactions: z.number(),
  notes: z.number(),
  documents: z.number(),
  jobs: z.number(),
  tasks: z.number(),
  projects: z.number(),
  goals: z.number(),
  inboxItems: z.number(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

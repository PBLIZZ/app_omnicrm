/**
 * AI Tool-Calling Type System
 *
 * Provides comprehensive type definitions for the AI agent tool-calling architecture.
 * Based on research into healthcare AI systems and wellness CRM best practices.
 *
 * @see /docs/AI_TOOL_CALLING_ARCHITECTURE.md for complete documentation
 */

import { z } from "zod";

// ============================================================================
// TOOL PARAMETER SCHEMA
// ============================================================================

/**
 * JSON Schema definition for tool parameters
 * Compatible with OpenAI/OpenRouter function calling format
 */
export const ToolParameterSchema = z.object({
  type: z.literal("object"),
  properties: z.record(
    z.object({
      type: z.enum(["string", "number", "boolean", "object", "array"]),
      description: z.string(),
      enum: z.array(z.string()).optional(),
      items: z
        .object({
          type: z.enum(["string", "number", "boolean", "object"]),
        })
        .optional(),
      properties: z.record(z.unknown()).optional(),
      required: z.array(z.string()).optional(),
    }),
  ),
  required: z.array(z.string()),
  additionalProperties: z.boolean().optional().default(false),
});

export type ToolParameterDef = z.infer<typeof ToolParameterSchema>;

// ============================================================================
// TOOL DEFINITION
// ============================================================================

/**
 * Tool category for organization and filtering
 */
export const ToolCategorySchema = z.enum([
  "data_access", // Read operations (get, list, search)
  "data_mutation", // Create, update, delete operations
  "communication", // Email, SMS, notifications
  "analytics", // Insights, reports, analysis
  "automation", // Workflow triggers, batch operations
  "external", // External API calls, knowledge access
]);

export type ToolCategory = z.infer<typeof ToolCategorySchema>;

/**
 * Permission level required to execute a tool
 */
export const PermissionLevelSchema = z.enum([
  "read", // Can only read data
  "write", // Can create/update data
  "admin", // Can delete data or trigger critical operations
]);

export type PermissionLevel = z.infer<typeof PermissionLevelSchema>;

/**
 * Complete tool definition metadata
 */
export const ToolDefinitionSchema = z.object({
  // Identity
  name: z.string().min(1),
  category: ToolCategorySchema,
  version: z.string().default("1.0.0"),

  // Documentation
  description: z.string().min(10),
  useCases: z.array(z.string()).min(1),
  exampleCalls: z.array(z.string()).optional(),

  // Parameters
  parameters: ToolParameterSchema,

  // Security
  permissionLevel: PermissionLevelSchema,
  creditCost: z.number().int().nonnegative().default(0),
  rateLimit: z
    .object({
      maxCalls: z.number().int().positive(),
      windowMs: z.number().int().positive(),
    })
    .optional(),

  // Behavior
  isIdempotent: z.boolean().default(false),
  cacheable: z.boolean().default(false),
  cacheTtlSeconds: z.number().int().positive().optional(),

  // Metadata
  tags: z.array(z.string()).default([]),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

// ============================================================================
// TOOL EXECUTION
// ============================================================================

/**
 * Context available to tool handlers
 */
export const ToolExecutionContextSchema = z.object({
  userId: z.string().uuid(),
  threadId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  timestamp: z.date(),
  requestId: z.string().uuid(),
});

export type ToolExecutionContext = z.infer<typeof ToolExecutionContextSchema>;

/**
 * Tool execution result
 */
export const ToolExecutionResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
  metadata: z
    .object({
      latencyMs: z.number().int().positive(),
      cached: z.boolean().default(false),
      retryCount: z.number().int().nonnegative().default(0),
    })
    .optional(),
});

export type ToolExecutionResult = z.infer<typeof ToolExecutionResultSchema>;

/**
 * Tool handler function signature
 */
export type ToolHandler<TParams = unknown, TResult = unknown> = (
  params: TParams,
  context: ToolExecutionContext,
) => Promise<TResult>;

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

/**
 * Complete tool registration including handler
 */
export interface RegisteredTool<TParams = unknown, TResult = unknown> {
  definition: ToolDefinition;
  handler: ToolHandler<TParams, TResult>;
}

// ============================================================================
// TOOL INVOCATION (Database Record)
// ============================================================================

/**
 * Database record of tool invocation
 * Stored in tool_invocations table for observability
 */
export const ToolInvocationRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  messageId: z.string().uuid(),
  threadId: z.string().uuid().optional(),
  toolName: z.string(),
  toolVersion: z.string(),
  args: z.unknown(),
  result: z.unknown().optional(),
  success: z.boolean(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  latencyMs: z.number().int().positive(),
  cached: z.boolean().default(false),
  createdAt: z.date(),
});

export type ToolInvocationRecord = z.infer<typeof ToolInvocationRecordSchema>;

// ============================================================================
// WORKFLOW ORCHESTRATION
// ============================================================================

/**
 * Multi-step workflow definition
 */
export const WorkflowStepSchema = z.object({
  stepId: z.string(),
  toolName: z.string(),
  params: z.unknown(),
  dependsOn: z.array(z.string()).default([]),
  continueOnError: z.boolean().default(false),
  retryPolicy: z
    .object({
      maxRetries: z.number().int().nonnegative(),
      backoffMs: z.number().int().positive(),
    })
    .optional(),
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  steps: z.array(WorkflowStepSchema),
  timeout: z.number().int().positive().optional(),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

// ============================================================================
// LLM FUNCTION CALLING FORMAT
// ============================================================================

/**
 * OpenAI/OpenRouter compatible function definition
 * Used when sending tools to LLM
 */
export const LLMFunctionDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: ToolParameterSchema,
});

export type LLMFunctionDefinition = z.infer<typeof LLMFunctionDefinitionSchema>;

/**
 * LLM function call (from LLM response)
 */
export const LLMFunctionCallSchema = z.object({
  name: z.string(),
  arguments: z.string(), // JSON string
});

export type LLMFunctionCall = z.infer<typeof LLMFunctionCallSchema>;

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Extract parameters type from tool definition
 */
export type ExtractParams<T> = T extends RegisteredTool<infer P, unknown> ? P : never;

/**
 * Extract result type from tool definition
 */
export type ExtractResult<T> = T extends RegisteredTool<unknown, infer R> ? R : never;

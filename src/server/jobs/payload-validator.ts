// SECURITY: Comprehensive job payload validation to prevent malicious or malformed job payloads
import { z, ZodIssue } from "zod";
import { log } from "@/server/log";
import type { JobKind, JobPayloadByKind } from "./types";

// Define maximum safe limits for job payloads
const PAYLOAD_LIMITS = {
  // Size limits (in bytes when JSON.stringified)
  maxPayloadSize: 1024 * 1024, // 1MB
  maxStringLength: 50000, // 50KB for any single string field
  maxArrayLength: 1000, // Max items in any array
  
  // Specific limits for different job types
  maxBatchItems: 500,
  maxInteractionId: 50, // UUID length + buffer
  maxBatchId: 50, // UUID length + buffer
} as const;

// Base schemas for common payload types
const batchJobPayloadSchema = z.object({
  batchId: z.string()
    .max(PAYLOAD_LIMITS.maxBatchId, "Batch ID too long")
    .uuid("Invalid batch ID format")
    .optional(),
});

const contactExtractionPayloadSchema = z.object({
  mode: z.enum(["single", "batch"] as const).optional(),
  interactionId: z.string()
    .max(PAYLOAD_LIMITS.maxInteractionId, "Interaction ID too long")
    .uuid("Invalid interaction ID format")
    .optional(),
  maxItems: z.number()
    .int("Max items must be an integer")
    .min(1, "Max items must be at least 1")
    .max(PAYLOAD_LIMITS.maxBatchItems, `Max items cannot exceed ${PAYLOAD_LIMITS.maxBatchItems}`)
    .optional(),
  batchId: z.string()
    .max(PAYLOAD_LIMITS.maxBatchId, "Batch ID too long")
    .uuid("Invalid batch ID format")
    .optional(),
});

// Empty payload schema for simple jobs
const emptyPayloadSchema = z.object({}).strict();

// Job-specific payload validators
const payloadSchemas: Record<JobKind, z.ZodSchema> = {
  // Generic job types - empty payloads
  normalize: emptyPayloadSchema,
  embed: emptyPayloadSchema,
  insight: emptyPayloadSchema,
  
  // Complex job types
  extract_contacts: contactExtractionPayloadSchema,
  
  // Google sync jobs - batch payloads
  google_gmail_sync: batchJobPayloadSchema,
  google_calendar_sync: batchJobPayloadSchema,
  normalize_google_email: batchJobPayloadSchema,
  normalize_google_event: batchJobPayloadSchema,
};

/**
 * Validates a job payload for a specific job kind
 * @param jobKind - The type of job
 * @param payload - The payload to validate
 * @param userId - User ID for logging context
 * @returns Validated payload or throws validation error
 */
export function validateJobPayload<K extends JobKind>(
  jobKind: K, 
  payload: unknown,
  userId: string
): JobPayloadByKind[K] {
  try {
    // SECURITY: Check payload size before parsing
    const payloadStr = JSON.stringify(payload);
    const payloadSize = Buffer.byteLength(payloadStr, 'utf8');
    
    if (payloadSize > PAYLOAD_LIMITS.maxPayloadSize) {
      log.warn({
        op: "job_payload.size_exceeded",
        userId,
        jobKind,
        payloadSize,
        maxSize: PAYLOAD_LIMITS.maxPayloadSize,
      }, "Job payload exceeds size limit");
      
      throw new Error(`Payload size ${Math.round(payloadSize / 1024)}KB exceeds limit of ${Math.round(PAYLOAD_LIMITS.maxPayloadSize / 1024)}KB`);
    }

    // SECURITY: Check for deeply nested objects or arrays (potential DoS)
    const depth = getObjectDepth(payload);
    if (depth > 10) {
      log.warn({
        op: "job_payload.depth_exceeded",
        userId,
        jobKind,
        depth,
      }, "Job payload has excessive nesting depth");
      
      throw new Error(`Payload nesting depth ${depth} exceeds limit of 10`);
    }

    // Get the appropriate schema
    const schema = payloadSchemas[jobKind];
    if (!schema) {
      log.error({
        op: "job_payload.unknown_job_kind",
        userId,
        jobKind,
      }, "Unknown job kind for payload validation");
      
      throw new Error(`Unknown job kind: ${jobKind}`);
    }

    // Validate against schema
    const result = schema.safeParse(payload);
    
    if (!result.success) {
      log.warn({
        op: "job_payload.validation_failed",
        userId,
        jobKind,
        errors: result.error.issues,
        payload: payloadStr.substring(0, 500), // Log first 500 chars for debugging
      }, "Job payload validation failed");
      
      // Create user-friendly error message
      const errorMessages = result.error.issues.map((issue: ZodIssue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
        return `${path}: ${issue.message}`;
      }).join('; ');
      
      throw new Error(`Invalid payload: ${errorMessages}`);
    }

    log.debug({
      op: "job_payload.validation_success",
      userId,
      jobKind,
      payloadSize,
    }, "Job payload validation successful");

    return result.data as JobPayloadByKind[K];

  } catch (error) {
    // Re-throw with job context
    if (error instanceof Error) {
      throw Object.assign(new Error(`Job payload validation failed for ${jobKind}: ${error.message}`), {
        status: 400,
        code: 'INVALID_PAYLOAD',
        jobKind,
        userId,
      });
    }
    throw error;
  }
}

/**
 * Pre-validate job payloads in batch operations
 */
export function validateJobPayloadBatch(
  jobs: Array<{ kind: JobKind; payload: unknown }>,
  userId: string
): Array<{ kind: JobKind; payload: unknown; valid: boolean; error?: string }> {
  const results = jobs.map(job => {
    try {
      validateJobPayload(job.kind, job.payload, userId);
      return { ...job, valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      return { ...job, valid: false, error: errorMessage };
    }
  });

  const invalidCount = results.filter(r => !r.valid).length;
  if (invalidCount > 0) {
    log.warn({
      op: "job_payload.batch_validation_failures",
      userId,
      totalJobs: jobs.length,
      invalidJobs: invalidCount,
      validJobs: jobs.length - invalidCount,
    }, "Some jobs failed payload validation in batch");
  }

  return results;
}

/**
 * Sanitize a job payload to remove potential security risks
 * @param payload - Raw payload
 * @returns Sanitized payload
 */
export function sanitizeJobPayload(payload: unknown): unknown {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload === 'string') {
    // Limit string length and remove potentially dangerous patterns
    let sanitized = payload.substring(0, PAYLOAD_LIMITS.maxStringLength);
    
    // Remove script tags and other potentially dangerous content
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:text\/html/gi, '');
    
    return sanitized;
  }

  if (Array.isArray(payload)) {
    // Limit array size and recursively sanitize elements
    return payload
      .slice(0, PAYLOAD_LIMITS.maxArrayLength)
      .map(item => sanitizeJobPayload(item));
  }

  if (typeof payload === 'object') {
    const sanitized: Record<string, unknown> = {};
    const entries = Object.entries(payload as Record<string, unknown>);
    
    // Limit number of properties (prevent hash DoS)
    for (const [key, value] of entries.slice(0, 50)) {
      // Sanitize keys (remove potentially dangerous characters)
      const sanitizedKey = key.replace(/[^\w.-]/g, '').substring(0, 100);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeJobPayload(value);
      }
    }
    
    return sanitized;
  }

  // For numbers, booleans, etc., return as-is after basic validation
  return payload;
}

/**
 * Calculate the maximum depth of nested objects/arrays
 */
function getObjectDepth(obj: unknown, currentDepth = 1): number {
  if (obj === null || typeof obj !== 'object') {
    return currentDepth;
  }

  if (currentDepth > 15) { // Safety limit to prevent stack overflow
    return currentDepth;
  }

  let maxDepth = currentDepth;

  if (Array.isArray(obj)) {
    for (const item of obj.slice(0, 10)) { // Only check first 10 items
      maxDepth = Math.max(maxDepth, getObjectDepth(item, currentDepth + 1));
    }
  } else {
    const entries = Object.entries(obj as Record<string, unknown>);
    for (const [, value] of entries.slice(0, 10)) { // Only check first 10 properties
      maxDepth = Math.max(maxDepth, getObjectDepth(value, currentDepth + 1));
    }
  }

  return maxDepth;
}

/**
 * Job payload size estimator (for pre-processing checks)
 */
export function estimatePayloadSize(payload: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(payload), 'utf8');
  } catch {
    return 0;
  }
}
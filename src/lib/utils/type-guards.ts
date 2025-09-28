/**
 * Type Guards and Runtime Validation Utilities
 *
 * Collection of type guards and validation functions to ensure type safety
 * when dealing with unknown data from APIs, user input, or external sources.
 */

// ============================================================================
// BASIC TYPE GUARDS
// ============================================================================

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isStringArray(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

export function isNumberArray(value: unknown): value is number[] {
  return isArray(value) && value.every(isNumber);
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function isValidDateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

// ============================================================================
// OBJECT PROPERTY EXTRACTORS WITH TYPE SAFETY
// ============================================================================

/**
 * Safely extract a string property from an object
 */
export function getString(obj: unknown, key: string): string | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return isString(value) ? value : undefined;
}

/**
 * Safely extract a number property from an object
 */
export function getNumber(obj: unknown, key: string): number | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return isNumber(value) ? value : undefined;
}

/**
 * Safely extract a boolean property from an object
 */
export function getBoolean(obj: unknown, key: string): boolean | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return isBoolean(value) ? value : undefined;
}

/**
 * Safely extract an object property from an object
 */
export function getObject(obj: unknown, key: string): Record<string, unknown> | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return isObject(value) ? value : undefined;
}

/**
 * Safely extract an array property from an object
 */
export function getArray(obj: unknown, key: string): unknown[] | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return isArray(value) ? value : undefined;
}

/**
 * Safely extract a string array property from an object
 */
export function getStringArray(obj: unknown, key: string): string[] | undefined {
  const arr = getArray(obj, key);
  return arr && isStringArray(arr) ? arr : undefined;
}

// ============================================================================
// API RESPONSE VALIDATION
// ============================================================================

// ApiEnvelope pattern has been replaced with Result<T, E> pattern
// Use isOk, isErr from "@/lib/utils/result" for API response validation



// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Type guard for Error objects
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (isString(error)) {
    return error;
  }
  if (isObject(error)) {
    const message = getString(error, "message");
    if (message) return message;
  }
  return "Unknown error occurred";
}

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export type ValidationResult<T> = { valid: true; data: T } | { valid: false; errors: string[] };

/**
 * Create a successful validation result
 */
export function validationSuccess<T>(data: T): ValidationResult<T> {
  return { valid: true, data };
}

/**
 * Create a failed validation result
 */
export function validationError<T>(errors: string[]): ValidationResult<T> {
  return { valid: false, errors };
}

// ============================================================================
// DOMAIN-SPECIFIC TYPE GUARDS
// ============================================================================

/**
 * Type guard for Contact Insights data
 */
export interface ContactInsightsData {
  summary: string;
  tags: string[];
  stage: string;
  confidenceScore: number;
  lastUpdated: string;
  insights: Array<{
    type: string;
    content: string;
    confidence: number;
  }>;
}

export function isContactInsights(value: unknown): value is ContactInsightsData {
  if (!isObject(value)) return false;

  const summary = getString(value, "summary");
  const tags = getStringArray(value, "tags");
  const stage = getString(value, "stage");
  const confidenceScore = getNumber(value, "confidenceScore");
  const lastUpdated = getString(value, "lastUpdated");
  const insights = getArray(value, "insights");

  return !!(summary && tags && stage &&
           typeof confidenceScore === "number" &&
           lastUpdated && insights &&
           insights.every(insight => isObject(insight) &&
             getString(insight, "type") &&
             getString(insight, "content") &&
             typeof getNumber(insight, "confidence") === "number"));
}

/**
 * Type guard for sync session progress data
 */
export interface SyncProgressData {
  sessionId: string;
  service: "gmail" | "calendar";
  status: "started" | "importing" | "processing" | "completed" | "failed" | "cancelled";
  progress: {
    percentage: number;
    currentStep: string;
    totalItems: number;
    importedItems: number;
    processedItems: number;
    failedItems: number;
  };
}

export function isSyncProgress(value: unknown): value is SyncProgressData {
  if (!isObject(value)) return false;

  const sessionId = getString(value, "sessionId");
  const service = getString(value, "service");
  const status = getString(value, "status");
  const progress = getObject(value, "progress");

  if (!sessionId || !service || !status || !progress) return false;

  const validServices = ["gmail", "calendar"];
  const validStatuses = ["started", "importing", "processing", "completed", "failed", "cancelled"];

  if (!validServices.includes(service) || !validStatuses.includes(status)) return false;

  // Validate progress object
  const percentage = getNumber(progress, "percentage");
  const currentStep = getString(progress, "currentStep");
  const totalItems = getNumber(progress, "totalItems");
  const importedItems = getNumber(progress, "importedItems");
  const processedItems = getNumber(progress, "processedItems");
  const failedItems = getNumber(progress, "failedItems");

  return !!(typeof percentage === "number" && currentStep &&
           typeof totalItems === "number" && typeof importedItems === "number" &&
           typeof processedItems === "number" && typeof failedItems === "number");
}

/**
 * Type guard for job status data
 */
export interface JobStatusData {
  id: string;
  kind: string;
  status: "queued" | "processing" | "done" | "error";
  batchId?: string;
  createdAt: string;
  message?: string;
}

export function isJobStatus(value: unknown): value is JobStatusData {
  if (!isObject(value)) return false;

  const id = getString(value, "id");
  const kind = getString(value, "kind");
  const status = getString(value, "status");
  const createdAt = getString(value, "createdAt");

  if (!id || !kind || !status || !createdAt) return false;

  const validStatuses = ["queued", "processing", "done", "error"];
  return validStatuses.includes(status);
}

/**
 * Type guard for array of job statuses
 */
export function isJobStatusArray(value: unknown): value is JobStatusData[] {
  return isArray(value) && value.every(isJobStatus);
}


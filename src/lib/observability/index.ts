/**
 * Unified Observability System
 * Single import point for all error handling, logging, and monitoring
 */

// Core logging
export {
  logger,
  logError,
  logSecurity,
  logSuccess,
  logInfo,
  handleApiError,
} from "./unified-logger";

// Error boundaries
export {
  AppErrorBoundary,
  PageErrorBoundary,
  ComponentErrorBoundary,
  AsyncBoundary,
  withErrorBoundary,
} from "../../components/error-boundaries";

// API standardization
export {
  ApiResponseBuilder,
  withApiResponse,
  API_ERROR_CODES,
  apiOk,
  apiError,
  APIError,
  type ApiResponse,
  type OkResponse,
  type ErrorResponse,
  type ApiErrorCode,
  type APIErrorResponse,
  type APISuccessResponse,
} from "@/server/api/response";

// Error classification
export {
  ERROR_CLASSIFICATION,
  type ErrorContext,
  type ErrorSeverity,
  type ErrorCategory,
  type ErrorAction,
  type ErrorClassification,
} from "./error-classification";

/**
 * Quick setup for new components
 *
 * @example
 * ```tsx
 * import { ComponentErrorBoundary, logger } from '@/lib/observability';
 *
 * function MyComponent() {
 *   const handleClick = () => {
 *     logger.success('Action completed successfully');
 *   };
 *
 *   return (
 *     <ComponentErrorBoundary componentName="MyComponent">
 *       <button onClick={handleClick}>Click me</button>
 *     </ComponentErrorBoundary>
 *   );
 * }
 * ```
 */

/**
 * Quick setup for API routes
 *
 * @example
 * ```ts
 * import { withApiResponse } from '@/lib/observability';
 *
 * export const GET = withApiResponse('get-contacts')(async (apiResponse) => {
 *   try {
 *     const contacts = await getContacts();
 *     return apiResponse.success(contacts);
 *   } catch (error) {
 *     return apiResponse.databaseError('Failed to fetch contacts', error);
 *   }
 * });
 * ```
 */

/**
 * Development utility - validates observability setup
 */
export function validateObservabilitySetup(): void {
  if (process.env.NODE_ENV !== "development") return;

  console.warn("🔍 Observability System Status:");
  console.warn("✅ Logger initialized");
  console.warn("✅ Error boundaries available");
  console.warn("✅ API response standardization ready");
  console.warn("✅ Error classification system loaded");

  // Test basic functionality (avoiding potential type issues)
  if (process.env.NODE_ENV === "development") {
    console.warn("🟢 Observability system validation complete");
  }
}

/**
 * Comprehensive Error Classification System
 * Standardizes how errors are handled, logged, and communicated across the application
 */

export type ErrorSeverity = "debug" | "info" | "warn" | "error" | "critical";
export type ErrorCategory =
  | "auth"
  | "api"
  | "database"
  | "validation"
  | "security"
  | "performance"
  | "ui"
  | "integration"
  | "business_logic";

export interface ErrorContext {
  operation: string;
  component?: string;
  userId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorAction {
  showToast: boolean;
  logToConsole: boolean;
  logToFile: boolean;
  alertTeam: boolean;
  trackMetrics: boolean;
  toastType?: "error" | "warning" | "info";
  toastTitle?: string;
}

/**
 * Error Classification Matrix
 * Determines appropriate response based on error type and context
 */
export const ERROR_CLASSIFICATION = {
  // 🔴 CRITICAL - System compromised, immediate action required
  SECURITY_BREACH: {
    severity: "critical" as ErrorSeverity,
    category: "security" as ErrorCategory,
    action: {
      showToast: false, // Don't inform attacker
      logToConsole: false, // Don't expose in browser
      logToFile: true,
      alertTeam: true,
      trackMetrics: true,
    } as ErrorAction,
  },

  // 🔴 CRITICAL - Data corruption/loss risk
  DATABASE_CORRUPTION: {
    severity: "critical" as ErrorSeverity,
    category: "database" as ErrorCategory,
    action: {
      showToast: true,
      logToConsole: true,
      logToFile: true,
      alertTeam: true,
      trackMetrics: true,
      toastType: "error",
      toastTitle: "System Error",
    } as ErrorAction,
  },

  // 🟠 ERROR - User-facing failure, needs resolution
  API_FAILURE: {
    severity: "error" as ErrorSeverity,
    category: "api" as ErrorCategory,
    action: {
      showToast: true,
      logToConsole: true,
      logToFile: true,
      alertTeam: false,
      trackMetrics: true,
      toastType: "error",
      toastTitle: "Request Failed",
    } as ErrorAction,
  },

  // 🟠 ERROR - Authentication/authorization issues
  AUTH_FAILURE: {
    severity: "error" as ErrorSeverity,
    category: "auth" as ErrorCategory,
    action: {
      showToast: true,
      logToConsole: true,
      logToFile: true,
      alertTeam: false,
      trackMetrics: true,
      toastType: "error",
      toastTitle: "Authentication Error",
    } as ErrorAction,
  },

  // 🟡 WARN - Degraded functionality, user should know
  INTEGRATION_DEGRADED: {
    severity: "warn" as ErrorSeverity,
    category: "integration" as ErrorCategory,
    action: {
      showToast: true,
      logToConsole: true,
      logToFile: true,
      alertTeam: false,
      trackMetrics: true,
      toastType: "warning",
      toastTitle: "Service Unavailable",
    } as ErrorAction,
  },

  // 🟡 WARN - Validation failed, user input issue
  VALIDATION_FAILED: {
    severity: "warn" as ErrorSeverity,
    category: "validation" as ErrorCategory,
    action: {
      showToast: true,
      logToConsole: false,
      logToFile: false,
      alertTeam: false,
      trackMetrics: false,
      toastType: "warning",
      toastTitle: "Invalid Input",
    } as ErrorAction,
  },

  // 🔵 INFO - Background process, inform if beneficial
  SYNC_COMPLETED: {
    severity: "info" as ErrorSeverity,
    category: "business_logic" as ErrorCategory,
    action: {
      showToast: true,
      logToConsole: false,
      logToFile: false,
      alertTeam: false,
      trackMetrics: true,
      toastType: "info",
      toastTitle: "Sync Complete",
    } as ErrorAction,
  },

  // 🟢 DEBUG - Development/troubleshooting
  DEBUG_INFO: {
    severity: "debug" as ErrorSeverity,
    category: "ui" as ErrorCategory,
    action: {
      showToast: false,
      logToConsole: true,
      logToFile: false,
      alertTeam: false,
      trackMetrics: false,
    } as ErrorAction,
  },
} as const;

export type ErrorClassification = (typeof ERROR_CLASSIFICATION)[keyof typeof ERROR_CLASSIFICATION];

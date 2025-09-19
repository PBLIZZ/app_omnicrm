/**
 * Error Classification Engine
 *
 * Provides comprehensive error classification, severity assessment, and recovery strategy mapping
 * for the Google Sync System. Transforms technical errors into user-friendly information with
 * actionable recovery suggestions.
 */

import { z } from "zod";

// Core error classification types
export const ErrorCategory = z.enum([
  'authentication',
  'network',
  'quota',
  'data_format',
  'processing',
  'permission',
  'configuration'
]);

export const ErrorSeverity = z.enum([
  'critical',   // Blocks all functionality
  'high',       // Blocks major functionality
  'medium',     // Partial failure, some data lost
  'low'         // Minor issues, most data preserved
]);

export const RecoveryAction = z.enum([
  'retry',
  'refresh_token',
  'adjust_preferences',
  'skip_item',
  'contact_support',
  'process_jobs',
  'wait_and_retry'
]);

// Recovery strategy definition
export const RecoveryStrategySchema = z.object({
  action: RecoveryAction,
  label: z.string(),
  description: z.string(),
  autoRetryable: z.boolean(),
  urgency: z.enum(['immediate', 'high', 'medium', 'low']).optional(),
  estimatedTime: z.string().optional(),
  preventionTips: z.array(z.string()).optional(),
});

export const ErrorClassificationSchema = z.object({
  category: ErrorCategory,
  severity: ErrorSeverity,
  userMessage: z.string(),
  technicalMessage: z.string(),
  recoveryStrategies: z.array(RecoveryStrategySchema),
  retryable: z.boolean(),
  estimatedImpact: z.string(),
  debugContext: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorClassification = z.infer<typeof ErrorClassificationSchema>;
export type RecoveryStrategy = z.infer<typeof RecoveryStrategySchema>;

/**
 * Comprehensive error classification patterns
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  category: z.infer<typeof ErrorCategory>;
  severity: z.infer<typeof ErrorSeverity>;
  getMessage: (match: RegExpMatchArray) => string;
  getRecoveryStrategies: () => RecoveryStrategy[];
}> = [
  // Authentication Errors
  {
    pattern: /invalid.?credentials|unauthorized|401|access.?denied|token.*invalid/i,
    category: 'authentication',
    severity: 'critical',
    getMessage: () => "Your Google account connection has expired or been revoked",
    getRecoveryStrategies: () => [
      {
        action: 'refresh_token',
        label: 'Reconnect Google Account',
        description: 'Sign in to Google again to restore access',
        autoRetryable: false,
        estimatedTime: '1-2 minutes',
        preventionTips: [
          'Keep your Google account password secure',
          'Avoid revoking app permissions manually'
        ]
      },
      {
        action: 'contact_support',
        label: 'Contact Support',
        description: 'Get help if reconnection doesn\'t work',
        autoRetryable: false,
        estimatedTime: '24 hours'
      }
    ]
  },

  // Quota and Rate Limit Errors
  {
    pattern: /quota.*exceeded|rate.?limit|429|too.?many.?requests|limit.*reached/i,
    category: 'quota',
    severity: 'medium',
    getMessage: () => "Google API limits have been reached",
    getRecoveryStrategies: () => [
      {
        action: 'wait_and_retry',
        label: 'Wait and Retry',
        description: 'Wait for quota reset and try again',
        autoRetryable: true,
        estimatedTime: '1-24 hours',
        preventionTips: [
          'Reduce sync frequency',
          'Use more specific email filters',
          'Sync smaller date ranges'
        ]
      },
      {
        action: 'adjust_preferences',
        label: 'Reduce Sync Scope',
        description: 'Limit date range or add more email filters',
        autoRetryable: false,
        estimatedTime: '2-3 minutes'
      }
    ]
  },

  // Network and Connectivity Errors
  {
    pattern: /network.*error|connection.*failed|timeout|502|503|504|dns.*error|ECONNRESET|ETIMEDOUT/i,
    category: 'network',
    severity: 'medium',
    getMessage: () => "Network connectivity issues prevented sync completion",
    getRecoveryStrategies: () => [
      {
        action: 'retry',
        label: 'Retry Sync',
        description: 'Try the sync operation again',
        autoRetryable: true,
        estimatedTime: '1-2 minutes',
        preventionTips: [
          'Check your internet connection',
          'Try again during non-peak hours'
        ]
      },
      {
        action: 'wait_and_retry',
        label: 'Wait and Retry',
        description: 'Wait a few minutes before trying again',
        autoRetryable: true,
        estimatedTime: '5-10 minutes'
      }
    ]
  },

  // Data Format and Parsing Errors
  {
    pattern: /parse.*error|invalid.*format|malformed.*data|encoding.*error|json.*error|mime.*type/i,
    category: 'data_format',
    severity: 'low',
    getMessage: () => "Some emails contain data that couldn't be processed",
    getRecoveryStrategies: () => [
      {
        action: 'skip_item',
        label: 'Skip Problem Items',
        description: 'Continue sync while skipping problematic emails',
        autoRetryable: false,
        estimatedTime: 'Immediate',
        preventionTips: [
          'Problematic emails will be marked for manual review',
          'Most of your data will still be imported successfully'
        ]
      },
      {
        action: 'contact_support',
        label: 'Report Data Issue',
        description: 'Help us improve handling of unusual email formats',
        autoRetryable: false,
        estimatedTime: '24-48 hours'
      }
    ]
  },

  // Permission and Access Errors
  {
    pattern: /permission.*denied|insufficient.*scope|access.*forbidden|403|scope.*required/i,
    category: 'permission',
    severity: 'high',
    getMessage: () => "Missing required permissions for Google account access",
    getRecoveryStrategies: () => [
      {
        action: 'refresh_token',
        label: 'Grant Required Permissions',
        description: 'Reconnect with full permissions enabled',
        autoRetryable: false,
        estimatedTime: '2-3 minutes',
        preventionTips: [
          'Grant all requested permissions during OAuth',
          'Check Google account security settings'
        ]
      },
      {
        action: 'contact_support',
        label: 'Permission Help',
        description: 'Get help with Google account permission setup',
        autoRetryable: false,
        estimatedTime: '24 hours'
      }
    ]
  },

  // Processing and Job Errors
  {
    pattern: /normalization.*failed|job.*failed|processing.*error|database.*constraint|validation.*error/i,
    category: 'processing',
    severity: 'medium',
    getMessage: () => "Data was imported but processing is incomplete",
    getRecoveryStrategies: () => [
      {
        action: 'process_jobs',
        label: 'Process Pending Data',
        description: 'Manually trigger processing of imported data',
        autoRetryable: false,
        estimatedTime: '2-5 minutes',
        preventionTips: [
          'Processing can be triggered manually anytime',
          'Your data is safely imported and will be processed'
        ]
      },
      {
        action: 'retry',
        label: 'Retry Processing',
        description: 'Attempt to process the data again',
        autoRetryable: true,
        estimatedTime: '1-2 minutes'
      }
    ]
  },

  // Configuration Errors
  {
    pattern: /configuration.*error|settings.*invalid|preference.*error|query.*invalid/i,
    category: 'configuration',
    severity: 'medium',
    getMessage: () => "Sync settings need to be adjusted",
    getRecoveryStrategies: () => [
      {
        action: 'adjust_preferences',
        label: 'Review Settings',
        description: 'Check and update your sync preferences',
        autoRetryable: false,
        estimatedTime: '2-3 minutes',
        preventionTips: [
          'Use simpler Gmail search queries',
          'Verify label names are correct',
          'Check date range settings'
        ]
      },
      {
        action: 'contact_support',
        label: 'Configuration Help',
        description: 'Get help optimizing your sync settings',
        autoRetryable: false,
        estimatedTime: '24 hours'
      }
    ]
  }
];

/**
 * Default classification for unrecognized errors
 */
const DEFAULT_CLASSIFICATION: ErrorClassification = {
  category: 'processing',
  severity: 'medium',
  userMessage: "An unexpected error occurred during sync",
  technicalMessage: "Unclassified error",
  recoveryStrategies: [
    {
      action: 'retry',
      label: 'Try Again',
      description: 'Retry the operation that failed',
      autoRetryable: true,
      estimatedTime: '1-2 minutes'
    },
    {
      action: 'contact_support',
      label: 'Get Help',
      description: 'Contact support for assistance',
      autoRetryable: false,
      estimatedTime: '24 hours'
    }
  ],
  retryable: true,
  estimatedImpact: "Some functionality may be limited until resolved"
};

/**
 * Main error classification function
 */
export function classifyError(
  error: string | Error,
  context?: {
    provider?: 'gmail' | 'calendar' | 'drive';
    stage?: 'ingestion' | 'normalization' | 'processing';
    operation?: string;
    userId?: string;
  }
): ErrorClassification {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Try to match against known patterns
  for (const pattern of ERROR_PATTERNS) {
    const match = errorMessage.match(pattern.pattern);
    if (match) {
      return {
        category: pattern.category,
        severity: pattern.severity,
        userMessage: pattern.getMessage(match),
        technicalMessage: errorMessage,
        recoveryStrategies: pattern.getRecoveryStrategies(),
        retryable: pattern.getRecoveryStrategies().some(s => s.autoRetryable),
        estimatedImpact: getEstimatedImpact(pattern.category, pattern.severity),
        debugContext: {
          ...context,
          originalError: errorMessage,
          stack: stack?.split('\n').slice(0, 5), // First 5 lines of stack
          timestamp: new Date().toISOString(),
          matchedPattern: pattern.pattern.source
        }
      };
    }
  }

  // Return default classification with context
  return {
    ...DEFAULT_CLASSIFICATION,
    technicalMessage: errorMessage,
    debugContext: {
      ...context,
      originalError: errorMessage,
      stack: stack?.split('\n').slice(0, 5),
      timestamp: new Date().toISOString(),
      classified: false
    }
  };
}

/**
 * Estimate impact based on category and severity
 */
function getEstimatedImpact(
  category: z.infer<typeof ErrorCategory>,
  severity: z.infer<typeof ErrorSeverity>
): string {
  const impacts = {
    critical: {
      authentication: "Complete sync blocked until reconnection",
      network: "All sync operations halted",
      quota: "Sync completely stopped",
      data_format: "Critical data processing failed",
      processing: "Essential functionality unavailable",
      permission: "Core features inaccessible",
      configuration: "System unusable with current settings"
    },
    high: {
      authentication: "Major features unavailable",
      network: "Frequent sync failures expected",
      quota: "Limited sync capability",
      data_format: "Significant data loss possible",
      processing: "Important features may not work",
      permission: "Key functionality restricted",
      configuration: "Poor sync performance"
    },
    medium: {
      authentication: "Some sync issues expected",
      network: "Occasional sync delays",
      quota: "Reduced sync frequency needed",
      data_format: "Some emails may be skipped",
      processing: "Data available but not fully processed",
      permission: "Limited feature access",
      configuration: "Suboptimal sync behavior"
    },
    low: {
      authentication: "Minor authentication warnings",
      network: "Rare connectivity issues",
      quota: "Slight performance impact",
      data_format: "Few items may be skipped",
      processing: "Minor processing delays",
      permission: "Optional features affected",
      configuration: "Minor efficiency loss"
    }
  };

  return impacts[severity][category];
}

/**
 * Group multiple errors for batch analysis
 */
export function classifyErrorBatch(
  errors: Array<{ error: string | Error; context?: Record<string, unknown> }>
): {
  classifications: ErrorClassification[];
  summary: {
    totalErrors: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    mostCritical: ErrorClassification | null;
    suggestedActions: RecoveryStrategy[];
  };
} {
  const classifications = errors.map(({ error, context }) =>
    classifyError(error, context)
  );

  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  classifications.forEach(c => {
    byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;
    bySeverity[c.severity] = (bySeverity[c.severity] ?? 0) + 1;
  });

  const severityOrder = ['critical', 'high', 'medium', 'low'];
  const mostCritical = classifications
    .sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity))[0] ?? null;

  // Aggregate unique recovery strategies
  const allStrategies = classifications.flatMap(c => c.recoveryStrategies);
  const uniqueStrategies = allStrategies.filter((strategy, index, arr) =>
    arr.findIndex(s => s.action === strategy.action) === index
  );

  return {
    classifications,
    summary: {
      totalErrors: errors.length,
      byCategory,
      bySeverity,
      mostCritical,
      suggestedActions: uniqueStrategies
    }
  };
}

/**
 * Generate user-friendly error report
 */
export function generateErrorReport(classification: ErrorClassification): {
  title: string;
  message: string;
  actions: RecoveryStrategy[];
  severity: string;
  impact: string;
} {
  const severityLabels = {
    critical: 'Critical Issue',
    high: 'High Priority',
    medium: 'Moderate Issue',
    low: 'Minor Issue'
  };

  return {
    title: severityLabels[classification.severity],
    message: classification.userMessage,
    actions: classification.recoveryStrategies,
    severity: classification.severity,
    impact: classification.estimatedImpact
  };
}
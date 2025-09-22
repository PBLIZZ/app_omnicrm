/**
 * GET /api/errors/summary — Comprehensive error summary with recovery suggestions
 *
 * Provides detailed error analysis for sync operations including:
 * - Error counts by category and severity
 * - Recent errors with classifications
 * - Recovery action recommendations
 * - Error patterns and trends
 * - Critical issues requiring immediate attention
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { ErrorTrackingService, type EnhancedErrorRecord, type ErrorSummary } from "@/server/services/error-tracking.service";
// RecoveryStrategy type from error classification
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { z } from "zod";

const errorSummaryQuerySchema = z.object({
  timeRangeHours: z.coerce.number().int().min(1).max(168).optional().default(24), // 1 hour to 1 week
  includeResolved: z.coerce.boolean().optional().default(false),
  provider: z.enum(['gmail', 'calendar', 'drive']).optional(),
  stage: z.enum(['ingestion', 'normalization', 'processing']).optional(),
  severityFilter: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  includeDetails: z.coerce.boolean().optional().default(true),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { searchParams } = new URL(request.url);

    const validation = errorSummaryQuerySchema.safeParse({
      timeRangeHours: searchParams.get('timeRangeHours'),
      includeResolved: searchParams.get('includeResolved'),
      provider: searchParams.get('provider'),
      stage: searchParams.get('stage'),
      severityFilter: searchParams.get('severityFilter'),
      includeDetails: searchParams.get('includeDetails'),
    });

    if (!validation.success) {
      return NextResponse.json({
        error: "Invalid query parameters",
        details: validation.error.issues
      }, { status: 400 });
    }

    const {
      timeRangeHours,
      includeResolved,
      provider,
      stage,
      severityFilter,
      includeDetails
    } = validation.data;

  try {
    // Get comprehensive error summary
    const errorSummary = await ErrorTrackingService.getErrorSummary(userId, {
      includeResolved,
      timeRangeHours,
      ...(provider !== undefined && { provider }),
      ...(stage !== undefined && { stage })
    });

    // Filter by severity if requested
    let filteredRecentErrors = errorSummary.recentErrors;
    let filteredCriticalErrors = errorSummary.criticalErrors;

    if (severityFilter) {
      filteredRecentErrors = errorSummary.recentErrors.filter(
        error => error.classification?.severity === severityFilter
      );
      filteredCriticalErrors = errorSummary.criticalErrors.filter(
        error => error.classification?.severity === severityFilter
      );
    }

    // Aggregate recovery strategies from recent errors
    const allRecoveryStrategies = filteredRecentErrors
      .flatMap(error => error.classification?.recoveryStrategies ?? [])
      .filter((strategy, index, arr) =>
        arr.findIndex(s => s.action === strategy.action) === index
      ); // Remove duplicates

    // Identify trending error patterns
    const errorPatterns = identifyErrorPatterns(filteredRecentErrors);

    // Calculate urgency score based on error types and frequency
    const urgencyScore = calculateUrgencyScore({
      criticalErrors: filteredCriticalErrors.length,
      totalErrors: errorSummary.totalErrors,
      recentFailureRate: filteredRecentErrors.length / Math.max(timeRangeHours, 1), // Errors per hour
      hasAuthErrors: filteredRecentErrors.some(e => e.classification?.category === 'authentication'),
      hasNetworkErrors: filteredRecentErrors.some(e => e.classification?.category === 'network'),
      hasQuotaErrors: filteredRecentErrors.some(e => e.classification?.category === 'quota'),
    });

    // Generate actionable recommendations
    const recommendations = generateErrorRecommendations({
      errorSummary,
      urgencyScore,
      errorPatterns,
      allRecoveryStrategies
    });

    // Prepare detailed error information if requested
    let errorDetails = null;
    if (includeDetails) {
      errorDetails = {
        recentErrors: filteredRecentErrors.slice(0, 10).map(error => ({
          id: error.id,
          provider: error.provider,
          stage: error.stage,
          errorAt: error.errorAt,
          category: error.classification?.category,
          severity: error.classification?.severity,
          userMessage: error.classification?.userMessage,
          technicalMessage: error.error,
          retryable: error.classification?.retryable,
          retryCount: error.retryCount ?? 0,
          userAcknowledged: error.userAcknowledged ?? false,
          recoveryActions: error.classification?.recoveryStrategies?.slice(0, 3) ?? []
        })),
        criticalErrors: filteredCriticalErrors.slice(0, 5).map(error => ({
          id: error.id,
          provider: error.provider,
          stage: error.stage,
          errorAt: error.errorAt,
          userMessage: error.classification?.userMessage,
          impact: error.classification?.estimatedImpact,
          recoveryActions: error.classification?.recoveryStrategies ?? []
        }))
      };
    }

    await logger.info("Error summary generated", {
      operation: "error_summary",
      additionalData: {
        userId,
        timeRangeHours,
        totalErrors: errorSummary.totalErrors,
        criticalErrors: filteredCriticalErrors.length,
        urgencyScore,
        filters: { provider, stage, severityFilter }
      }
    });

    return NextResponse.json({
      summary: {
        totalErrors: errorSummary.totalErrors,
        pendingErrors: errorSummary.pendingErrors,
        resolvedErrors: errorSummary.resolvedErrors,
        criticalErrorCount: filteredCriticalErrors.length,
        retryableErrorCount: errorSummary.retryableErrors.length,
        timeRange: `${timeRangeHours} hours`,
        lastUpdated: new Date().toISOString(),
      },
      categorization: {
        byCategory: errorSummary.errorsByCategory,
        bySeverity: errorSummary.errorsBySeverity,
        byProvider: provider ? { [provider]: errorSummary.totalErrors } : undefined,
        byStage: stage ? { [stage]: errorSummary.totalErrors } : undefined,
      },
      urgency: {
        score: urgencyScore,
        level: getUrgencyLevel(urgencyScore),
        requiresImmediateAction: urgencyScore >= 80,
        description: getUrgencyDescription(urgencyScore),
      },
      patterns: errorPatterns,
      recommendations: recommendations,
      recoveryActions: allRecoveryStrategies.slice(0, 5), // Top 5 most relevant actions
      errorDetails,
      hasMoreErrors: errorSummary.totalErrors > (errorDetails?.recentErrors.length || 0),
      nextSteps: generateNextSteps({
        urgencyScore,
        hasAuthErrors: filteredRecentErrors.some(e => e.classification?.category === 'authentication'),
        hasProcessingErrors: filteredRecentErrors.some(e => e.classification?.category === 'processing'),
        retryableErrorCount: errorSummary.retryableErrors.length,
      })
    });

  } catch (error) {
    await logger.error("Failed to generate error summary", {
      operation: "error_summary",
      additionalData: { userId, timeRangeHours, provider, stage }
    }, ensureError(error));

    return NextResponse.json({ error: "Failed to retrieve error summary" }, { status: 500 });
  }
  } catch (error) {
    console.error("GET /api/errors/summary error:", error);
    return NextResponse.json({ error: "Failed to retrieve error summary" }, { status: 500 });
  }
}

// Define error pattern interfaces
interface ErrorPattern {
  pattern: string;
  count: number;
  description: string;
  suggestion: string;
}

interface PatternData {
  count: number;
  errors: EnhancedErrorRecord[];
}

/**
 * Identify patterns in recent errors
 */
function identifyErrorPatterns(errors: EnhancedErrorRecord[]): ErrorPattern[] {
  const patterns: Record<string, PatternData> = {};

  errors.forEach(error => {
    const category = error.classification?.category || 'unknown';
    if (!patterns[category]) {
      patterns[category] = { count: 0, errors: [] };
    }
    patterns[category].count++;
    patterns[category].errors.push(error);
  });

  return Object.entries(patterns)
    .map(([category, data]) => ({
      pattern: category,
      count: data.count,
      description: getPatternDescription(category, data.count),
      suggestion: getPatternSuggestion(category)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 patterns
}

/**
 * Calculate urgency score (0-100) based on error characteristics
 */
function calculateUrgencyScore(metrics: {
  criticalErrors: number;
  totalErrors: number;
  recentFailureRate: number;
  hasAuthErrors: boolean;
  hasNetworkErrors: boolean;
  hasQuotaErrors: boolean;
}): number {
  let score = 0;

  // Critical errors have highest weight
  score += Math.min(metrics.criticalErrors * 25, 50);

  // Recent failure rate
  if (metrics.recentFailureRate > 5) score += 20; // More than 5 errors per hour
  else if (metrics.recentFailureRate > 2) score += 10;

  // Specific error types
  if (metrics.hasAuthErrors) score += 20; // Auth errors block everything
  if (metrics.hasQuotaErrors) score += 15; // Quota errors limit functionality
  if (metrics.hasNetworkErrors) score += 10; // Network errors cause retries

  // Total error volume
  if (metrics.totalErrors > 50) score += 15;
  else if (metrics.totalErrors > 20) score += 10;
  else if (metrics.totalErrors > 10) score += 5;

  return Math.min(100, score);
}

/**
 * Get urgency level description
 */
function getUrgencyLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/**
 * Get urgency description
 */
function getUrgencyDescription(score: number): string {
  if (score >= 80) return "Immediate action required - critical errors are blocking functionality";
  if (score >= 60) return "High priority - errors are significantly impacting sync operations";
  if (score >= 30) return "Moderate concern - some errors need attention to maintain performance";
  return "Low priority - minor issues that can be addressed when convenient";
}

// RecoveryStrategy interface removed - using inline type in RecommendationContext

// Define recommendation context interface
interface RecommendationContext {
  errorSummary: ErrorSummary;
  urgencyScore: number;
  errorPatterns: ErrorPattern[];
  allRecoveryStrategies: Array<{
    action: string;
    label: string;
    description: string;
    autoRetryable: boolean;
    urgency?: 'immediate' | 'high' | 'medium' | 'low' | undefined;
    estimatedTime?: string | undefined;
    preventionTips?: string[] | undefined;
  }>;
}

/**
 * Generate actionable recommendations
 */
function generateErrorRecommendations(context: RecommendationContext): string[] {
  const recommendations: string[] = [];

  if (context.urgencyScore >= 80) {
    recommendations.push("🚨 Address critical authentication or quota errors immediately");
  }

  if (context.errorPatterns.some(p => p.pattern === 'authentication')) {
    recommendations.push("🔑 Reconnect your Google account to restore access");
  }

  if (context.errorPatterns.some(p => p.pattern === 'quota')) {
    recommendations.push("⏱️ Wait for API quota reset or reduce sync frequency");
  }

  if (context.errorPatterns.some(p => p.pattern === 'network')) {
    recommendations.push("🌐 Check internet connection and retry failed operations");
  }

  if (context.errorPatterns.some(p => p.pattern === 'processing')) {
    recommendations.push("⚙️ Process pending jobs to complete data normalization");
  }

  if (context.errorSummary.retryableErrors.length > 0) {
    recommendations.push(`🔄 ${context.errorSummary.retryableErrors.length} errors can be automatically retried`);
  }

  return recommendations.slice(0, 5); // Limit to top 5
}

/**
 * Generate next steps
 */
function generateNextSteps(context: {
  urgencyScore: number;
  hasAuthErrors: boolean;
  hasProcessingErrors: boolean;
  retryableErrorCount: number;
}): string[] {
  const steps: string[] = [];

  if (context.hasAuthErrors) {
    steps.push("1. Reconnect your Google account in Settings");
  }

  if (context.hasProcessingErrors) {
    steps.push(`${steps.length + 1}. Process pending jobs to complete data normalization`);
  }

  if (context.retryableErrorCount > 0) {
    steps.push(`${steps.length + 1}. Retry ${context.retryableErrorCount} failed operations`);
  }

  if (context.urgencyScore >= 60) {
    steps.push(`${steps.length + 1}. Monitor error status closely for the next hour`);
  }

  steps.push(`${steps.length + 1}. Contact support if errors persist after following these steps`);

  return steps.slice(0, 4); // Limit to 4 steps
}

/**
 * Get pattern description
 */
function getPatternDescription(category: string, count: number): string {
  const descriptions = {
    authentication: `${count} authentication error${count !== 1 ? 's' : ''} - Google account access issues`,
    network: `${count} network error${count !== 1 ? 's' : ''} - connectivity and timeout issues`,
    quota: `${count} quota error${count !== 1 ? 's' : ''} - API rate limit exceeded`,
    data_format: `${count} data format error${count !== 1 ? 's' : ''} - email parsing issues`,
    processing: `${count} processing error${count !== 1 ? 's' : ''} - job execution failures`,
    permission: `${count} permission error${count !== 1 ? 's' : ''} - insufficient Google permissions`,
    configuration: `${count} configuration error${count !== 1 ? 's' : ''} - sync settings issues`,
  };

  return descriptions[category as keyof typeof descriptions] || `${count} ${category} error${count !== 1 ? 's' : ''}`;
}

/**
 * Get pattern suggestion
 */
function getPatternSuggestion(category: string): string {
  const suggestions = {
    authentication: "Reconnect your Google account to restore access",
    network: "Check internet connection and retry during stable connectivity",
    quota: "Wait for quota reset or reduce sync frequency",
    data_format: "Skip problematic emails and continue with remaining data",
    processing: "Manually trigger job processing to complete normalization",
    permission: "Grant additional permissions during Google account reconnection",
    configuration: "Review and adjust your sync preferences",
  };

  return suggestions[category as keyof typeof suggestions] || "Review error details for specific resolution steps";
}
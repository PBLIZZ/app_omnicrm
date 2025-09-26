import {
  ErrorTrackingService,
  type EnhancedErrorRecord,
  type ErrorSummary,
} from "@/server/services/error-tracking.service";
import { ERROR_CATEGORIES } from "@/lib/constants/errorCategories";
import { z } from "zod";

export interface ErrorSummaryQuery {
  timeRangeHours?: number;
  includeResolved?: boolean;
  provider?: "gmail" | "calendar" | "drive";
  stage?: "ingestion" | "normalization" | "processing";
  severityFilter?: "critical" | "high" | "medium" | "low";
  includeDetails?: boolean;
}

export interface ErrorPattern {
  pattern: string;
  frequency: number;
  severity: "critical" | "high" | "medium" | "low";
  examples: EnhancedErrorRecord[];
  suggestedAction: string;
}

export interface UrgencyScore {
  score: number; // 0-100
  level: "low" | "medium" | "high" | "critical";
  factors: string[];
}

export interface ErrorSummaryResponse {
  summary: ErrorSummary;
  recentErrors: EnhancedErrorRecord[];
  criticalErrors: EnhancedErrorRecord[];
  recoveryStrategies: Array<{
    action: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
  errorPatterns: ErrorPattern[];
  urgencyScore: UrgencyScore;
  recommendations: string[];
}

const errorSummaryQuerySchema = z.object({
  timeRangeHours: z.coerce.number().int().min(1).max(168).optional().default(24), // 1 hour to 1 week
  includeResolved: z.coerce.boolean().optional().default(false),
  provider: z.enum(["gmail", "calendar", "drive"]).optional(),
  stage: z.enum(["ingestion", "normalization", "processing"]).optional(),
  severityFilter: z.enum(["critical", "high", "medium", "low"]).optional(),
  includeDetails: z.coerce.boolean().optional().default(true),
});

export class ErrorSummaryService {
  /**
   * Get comprehensive error summary with analysis and recommendations
   *
   * @param userId - The user ID
   * @param query - Query parameters for filtering
   * @returns Promise<ErrorSummaryResponse> - Complete error analysis
   */
  static async getErrorSummary(
    userId: string,
    query: ErrorSummaryQuery,
  ): Promise<ErrorSummaryResponse> {
    const {
      timeRangeHours = 24,
      includeResolved = false,
      provider,
      stage,
      severityFilter,
      includeDetails = true,
    } = query;

    // Get comprehensive error summary
    const errorSummary = await ErrorTrackingService.getErrorSummary(userId, {
      includeResolved,
      timeRangeHours,
      ...(provider !== undefined && { provider }),
      ...(stage !== undefined && { stage }),
    });

    // Filter by severity if requested
    let filteredRecentErrors = errorSummary.recentErrors;
    let filteredCriticalErrors = errorSummary.criticalErrors;

    if (severityFilter) {
      filteredRecentErrors = errorSummary.recentErrors.filter(
        (error) => error.classification?.severity === severityFilter,
      );
      filteredCriticalErrors = errorSummary.criticalErrors.filter(
        (error) => error.classification?.severity === severityFilter,
      );
    }

    // Aggregate recovery strategies from recent errors
    const allRecoveryStrategies = filteredRecentErrors
      .flatMap((error) => error.classification?.recoveryStrategies ?? [])
      .filter(
        (strategy, index, arr) => arr.findIndex((s) => s.action === strategy.action) === index,
      ); // Remove duplicates

    // Identify trending error patterns
    const errorPatterns = this.identifyErrorPatterns(filteredRecentErrors);

    // Calculate urgency score based on error types and frequency
    const urgencyScore = this.calculateUrgencyScore({
      criticalErrors: filteredCriticalErrors.length,
      totalErrors: errorSummary.totalErrors,
      recentFailureRate: filteredRecentErrors.length / Math.max(timeRangeHours, 1), // Errors per hour
      hasAuthErrors: filteredRecentErrors.some(
        (e) => e.classification?.category === ERROR_CATEGORIES.AUTH,
      ),
      hasRateLimitErrors: filteredRecentErrors.some(
        (e) => e.classification?.category === ERROR_CATEGORIES.RATE_LIMIT,
      ),
      hasDataErrors: filteredRecentErrors.some(
        (e) => e.classification?.category === ERROR_CATEGORIES.DATA,
      ),
    });

    // Generate recommendations based on analysis
    const recommendations = this.generateRecommendations({
      errorSummary,
      errorPatterns,
      urgencyScore,
      recentErrors: filteredRecentErrors,
    });

    return {
      summary: errorSummary,
      recentErrors: filteredRecentErrors,
      criticalErrors: filteredCriticalErrors,
      recoveryStrategies: allRecoveryStrategies,
      errorPatterns,
      urgencyScore,
      recommendations,
    };
  }

  /**
   * Identify recurring error patterns from recent errors
   *
   * @param recentErrors - Array of recent error records
   * @returns ErrorPattern[] - Identified patterns with analysis
   */
  private static identifyErrorPatterns(recentErrors: EnhancedErrorRecord[]): ErrorPattern[] {
    const patterns: Map<string, ErrorPattern> = new Map();

    recentErrors.forEach((error) => {
      const category = error.classification?.category || "unknown";
      const severity = error.classification?.severity || "low";

      const patternKey = `${category}-${severity}`;

      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          pattern: `${category} errors (${severity} severity)`,
          frequency: 0,
          severity: severity as "critical" | "high" | "medium" | "low",
          examples: [],
          suggestedAction: this.getSuggestedActionForCategory(category),
        });
      }

      const pattern = patterns.get(patternKey)!;
      pattern.frequency++;
      pattern.examples.push(error);
    });

    return Array.from(patterns.values()).sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Calculate urgency score based on error characteristics
   *
   * @param params - Error metrics for calculation
   * @returns UrgencyScore - Calculated urgency with factors
   */
  private static calculateUrgencyScore(params: {
    criticalErrors: number;
    totalErrors: number;
    recentFailureRate: number;
    hasAuthErrors: boolean;
    hasRateLimitErrors: boolean;
    hasDataErrors: boolean;
  }): UrgencyScore {
    const {
      criticalErrors,
      totalErrors,
      recentFailureRate,
      hasAuthErrors,
      hasRateLimitErrors,
      hasDataErrors,
    } = params;

    let score = 0;
    const factors: string[] = [];

    // Critical errors have highest impact
    if (criticalErrors > 0) {
      score += Math.min(criticalErrors * 20, 60);
      factors.push(`${criticalErrors} critical error(s)`);
    }

    // High failure rate indicates systemic issues
    if (recentFailureRate > 5) {
      score += 30;
      factors.push(`High failure rate: ${recentFailureRate.toFixed(1)} errors/hour`);
    } else if (recentFailureRate > 2) {
      score += 15;
      factors.push(`Moderate failure rate: ${recentFailureRate.toFixed(1)} errors/hour`);
    }

    // Auth errors are critical for functionality
    if (hasAuthErrors) {
      score += 25;
      factors.push("Authentication errors detected");
    }

    // Rate limit errors indicate scaling issues
    if (hasRateLimitErrors) {
      score += 15;
      factors.push("Rate limiting issues detected");
    }

    // Data errors affect data integrity
    if (hasDataErrors) {
      score += 20;
      factors.push("Data integrity issues detected");
    }

    // High total error count indicates systemic problems
    if (totalErrors > 100) {
      score += 10;
      factors.push(`High total error count: ${totalErrors}`);
    }

    // Determine urgency level
    let level: "low" | "medium" | "high" | "critical";
    if (score >= 80) {
      level = "critical";
    } else if (score >= 60) {
      level = "high";
    } else if (score >= 30) {
      level = "medium";
    } else {
      level = "low";
    }

    return {
      score: Math.min(score, 100),
      level,
      factors,
    };
  }

  /**
   * Generate actionable recommendations based on error analysis
   *
   * @param analysis - Error analysis data
   * @returns string[] - List of recommendations
   */
  private static generateRecommendations(analysis: {
    errorSummary: ErrorSummary;
    errorPatterns: ErrorPattern[];
    urgencyScore: UrgencyScore;
    recentErrors: EnhancedErrorRecord[];
  }): string[] {
    const recommendations: string[] = [];
    const { errorSummary, errorPatterns, urgencyScore, recentErrors } = analysis;

    // High urgency recommendations
    if (urgencyScore.level === "critical") {
      recommendations.push("🚨 IMMEDIATE ACTION REQUIRED: Critical errors detected");
      recommendations.push("Review and resolve critical errors immediately");
    }

    // Pattern-based recommendations
    const topPattern = errorPatterns[0];
    if (topPattern && topPattern.frequency > 5) {
      recommendations.push(
        `Address recurring ${topPattern.pattern} (${topPattern.frequency} occurrences)`,
      );
    }

    // Auth error recommendations
    const authErrors = recentErrors.filter(
      (e) => e.classification?.category === ERROR_CATEGORIES.AUTH,
    );
    if (authErrors.length > 0) {
      recommendations.push("Check authentication credentials and token validity");
    }

    // Rate limit recommendations
    const rateLimitErrors = recentErrors.filter(
      (e) => e.classification?.category === ERROR_CATEGORIES.RATE_LIMIT,
    );
    if (rateLimitErrors.length > 0) {
      recommendations.push("Implement exponential backoff for API calls");
      recommendations.push("Consider upgrading API rate limits");
    }

    // Data error recommendations
    const dataErrors = recentErrors.filter(
      (e) => e.classification?.category === ERROR_CATEGORIES.DATA,
    );
    if (dataErrors.length > 0) {
      recommendations.push("Review data validation and processing logic");
    }

    // General recommendations based on error volume
    if (errorSummary.totalErrors > 50) {
      recommendations.push("Consider implementing more robust error handling");
    }

    if (recentErrors.length === 0) {
      recommendations.push("✅ No recent errors - system is healthy");
    }

    return recommendations;
  }

  /**
   * Get suggested action for error category
   *
   * @param category - Error category
   * @returns string - Suggested action
   */
  private static getSuggestedActionForCategory(category: string): string {
    switch (category) {
      case ERROR_CATEGORIES.AUTH:
        return "Check authentication credentials and refresh tokens";
      case ERROR_CATEGORIES.RATE_LIMIT:
        return "Implement exponential backoff and rate limiting";
      case ERROR_CATEGORIES.DATA:
        return "Review data validation and processing logic";
      case ERROR_CATEGORIES.NETWORK:
        return "Check network connectivity and retry logic";
      case ERROR_CATEGORIES.CONFIGURATION:
        return "Verify configuration settings and environment variables";
      default:
        return "Review error logs and implement appropriate error handling";
    }
  }

  /**
   * Validate error summary query parameters
   *
   * @param query - Raw query parameters
   * @returns ErrorSummaryQuery - Validated query parameters
   */
  static validateQuery(query: Record<string, unknown>): ErrorSummaryQuery {
    return errorSummaryQuerySchema.parse(query);
  }
}

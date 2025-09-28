/**
 * OmniRhythm Component Types
 *
 * Types for rhythm and productivity tracking components
 */

/**
 * Rhythm Pattern
 */
export interface RhythmPattern {
  id: string;
  name: string;
  type: "daily" | "weekly" | "monthly";
  frequency: number;
  data: Record<string, unknown>;
}

/**
 * Productivity Metric
 */
export interface ProductivityMetric {
  id: string;
  name: string;
  value: number;
  trend: "up" | "down" | "stable";
  period: string;
}

/**
 * Rhythm Dashboard Props
 */
export interface RhythmDashboardProps {
  userId: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}
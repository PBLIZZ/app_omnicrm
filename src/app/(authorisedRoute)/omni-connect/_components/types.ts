/**
 * OmniConnect Component Types
 *
 * Types for omni-connect intelligence components
 */

/**
 * Intelligence Tag
 */
export interface IntelligenceTag {
  id: string;
  name: string;
  count: number;
  category: string;
}

/**
 * Intelligence Insight
 */
export interface IntelligenceInsight {
  id: string;
  type: string;
  content: string;
  confidence: number;
  timestamp: Date;
  source?: string;
}

/**
 * Recommended Action
 */
export interface RecommendedAction {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedTime?: string;
}

/**
 * Connect Intelligence Dashboard Props
 */
export interface ConnectIntelligenceDashboardProps {
  userId: string;
  timeRange?: {
    from: Date;
    to: Date;
  };
}
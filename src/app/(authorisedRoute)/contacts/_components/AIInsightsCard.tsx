"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Brain,
  Heart,
  Shield,
} from "lucide-react";

interface AIInsightsCardProps {
  contactId: string;
  expanded: boolean;
  onToggle: () => void;
}

interface AIInsight {
  id: string;
  type: "risk" | "sentiment" | "suggestion" | "trend";
  title: string;
  description: string;
  confidence: number; // 0-100
  priority: "high" | "medium" | "low";
  category: string;
  createdAt: Date;
}

// Mock data for now - in production this would come from an API
const mockInsights: AIInsight[] = [
  {
    id: "1",
    type: "risk",
    title: "Stress Level Increase",
    description:
      "Client's stress indicators have increased 30% over the past week based on session notes and communication patterns.",
    confidence: 85,
    priority: "high",
    category: "Risk Flags",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: "2",
    type: "sentiment",
    title: "Positive Progress",
    description:
      "Overall sentiment trending positive with 80% of recent interactions showing improvement in mood and outlook.",
    confidence: 92,
    priority: "medium",
    category: "Sentiment Trends",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
  },
  {
    id: "3",
    type: "suggestion",
    title: "Breathing Exercise Focus",
    description:
      "Consider emphasizing diaphragmatic breathing techniques in next session based on client's response patterns.",
    confidence: 78,
    priority: "medium",
    category: "Suggested Agenda",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
  },
  {
    id: "4",
    type: "trend",
    title: "Session Frequency",
    description:
      "Client responds well to weekly sessions. Current schedule appears optimal for progress.",
    confidence: 88,
    priority: "low",
    category: "Patterns",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
  },
  {
    id: "5",
    type: "risk",
    title: "Sleep Quality Concern",
    description:
      "Multiple mentions of sleep disturbances in recent notes. May need to address sleep hygiene.",
    confidence: 75,
    priority: "high",
    category: "Risk Flags",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
  },
  {
    id: "6",
    type: "suggestion",
    title: "Progressive Muscle Relaxation",
    description:
      "Client shows interest in relaxation techniques. PMR could be beneficial for stress management.",
    confidence: 82,
    priority: "medium",
    category: "Suggested Agenda",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
];

const getInsightIcon = (type: AIInsight["type"]) => {
  switch (type) {
    case "risk":
      return AlertTriangle;
    case "sentiment":
      return Heart;
    case "suggestion":
      return Brain;
    case "trend":
      return TrendingUp;
    default:
      return Sparkles;
  }
};

const getPriorityColor = (priority: AIInsight["priority"]) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getTypeColor = (type: AIInsight["type"]) => {
  switch (type) {
    case "risk":
      return "text-red-600";
    case "sentiment":
      return "text-blue-600";
    case "suggestion":
      return "text-purple-600";
    case "trend":
      return "text-green-600";
    default:
      return "text-gray-600";
  }
};

/**
 * AI Insights Card Component
 * Collapsible card showing AI-generated insights and recommendations
 */
export function AIInsightsCard({
  contactId,
  expanded,
  onToggle,
}: AIInsightsCardProps): JSX.Element {
  // In production, this would fetch from an API endpoint
  const { data: insights, isLoading } = useQuery({
    queryKey: [`/api/contacts/${contactId}/ai-insights`],
    queryFn: async (): Promise<AIInsight[]> => {
      // TODO: Implement actual API call
      return mockInsights;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const insightsByCategory =
    insights?.reduce(
      (acc, insight) => {
        if (!acc[insight.category]) {
          acc[insight.category] = [];
        }
        acc[insight.category].push(insight);
        return acc;
      },
      {} as Record<string, AIInsight[]>,
    ) || {};

  return (
    <Card className={`transition-all duration-300 ${expanded ? "w-full" : "w-12"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Sparkles className="h-5 w-5" />
              {!expanded && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
            {expanded && (
              <>
                <CardTitle className="text-base">AI Insights</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {insights?.length || 0}
                </Badge>
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle} className="h-6 w-6 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        {expanded && <CardDescription>AI-powered insights and recommendations</CardDescription>}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                  </div>
                  <div className="h-3 bg-muted rounded animate-pulse w-full" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              ))}
            </div>
          ) : insights && insights.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {Object.entries(insightsByCategory).map(([category, categoryInsights]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center">
                    {category === "Risk Flags" && <Shield className="h-3 w-3 mr-1" />}
                    {category === "Sentiment Trends" && <Heart className="h-3 w-3 mr-1" />}
                    {category === "Suggested Agenda" && <Calendar className="h-3 w-3 mr-1" />}
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {categoryInsights.slice(0, 2).map((insight) => {
                      const Icon = getInsightIcon(insight.type);

                      return (
                        <div key={insight.id} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-start space-x-2">
                            <Icon className={`h-4 w-4 mt-0.5 ${getTypeColor(insight.type)}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{insight.title}</span>
                                <div className="flex items-center space-x-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getPriorityColor(insight.priority)}`}
                                  >
                                    {insight.priority}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {insight.confidence}%
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {insight.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No insights yet</p>
              <p className="text-xs text-muted-foreground">
                AI insights will appear as you add more notes and interactions
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

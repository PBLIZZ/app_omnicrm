"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Target } from "lucide-react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import type { ContactAIInsightsResponse } from "@/server/db/business-schemas/contacts";

interface AIInsightsSidebarProps {
  contactId?: string;
  insights: ContactAIInsightsResponse | null;
  isLoading: boolean;
  onGenerateInsights: () => void;
}

export function AIInsightsSidebar({
  insights,
  isLoading,
  onGenerateInsights,
}: AIInsightsSidebarProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-4">
      {/* Main AI Insights Card */}
      <Card className="border-2 border-purple-200 dark:border-purple-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              AI Insights
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 px-2"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          <CardDescription className="text-xs">AI-powered analysis and recommendations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!insights ? (
            <div className="text-center py-8">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50 text-purple-600" />
              <p className="text-sm text-muted-foreground mb-3">
                Generate AI insights to discover patterns, risks, and recommendations
              </p>
              <Button size="sm" onClick={onGenerateInsights} disabled={isLoading}>
                <Sparkles className="h-4 w-4 mr-2" />
                {isLoading ? "Generating..." : "Generate Insights"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              {insights.summary && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Summary</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insights.summary}</p>
                </div>
              )}

              {/* Quick Insights Preview (Collapsed) */}
              {!isExpanded && insights.insights && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {insights.insights.length} insights
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Click to expand full insights →</p>
                </div>
              )}

              {/* Expanded Insights */}
              {isExpanded && (
                <Collapsible open={isExpanded}>
                  <CollapsibleContent className="space-y-4">
                    {/* Insights */}
                    {insights.insights && insights.insights.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Detailed Insights</h4>
                        {insights.insights.map((insight, index) => {
                          // Type guard for insight structure
                          if (
                            typeof insight !== "object" ||
                            insight === null ||
                            !("type" in insight) ||
                            !("content" in insight)
                          ) {
                            return null;
                          }

                          const insightData = insight as {
                            type: string;
                            content: string;
                            confidence?: number;
                          };

                          return (
                            <div
                              key={index}
                              className="border-l-2 border-purple-200 dark:border-purple-800 pl-3 py-2 space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {insightData.type}
                                </Badge>
                                {insightData.confidence !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(insightData.confidence * 100)}% confidence
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {insightData.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Recommendations */}
                    {insights.recommendations && insights.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5" />
                          Recommendations
                        </h4>
                        <ul className="space-y-2">
                          {insights.recommendations.map((rec, index) => (
                            <li
                              key={index}
                              className="text-xs text-muted-foreground flex items-start gap-2"
                            >
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span className="flex-1">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Regenerate Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateInsights}
                disabled={isLoading}
                className="w-full text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1.5" />
                Regenerate Insights
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Card (Placeholder) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>Session notes: {/* notes count will be passed */}</p>
          <p>Interactions: Coming soon</p>
          <p>Next appointment: Coming soon</p>
        </CardContent>
      </Card>

      {/* Risk Flags (Placeholder) */}
      <Card className="border-amber-200 dark:border-amber-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Risk Flags
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <p>No risk flags detected</p>
        </CardContent>
      </Card>
    </div>
  );
}

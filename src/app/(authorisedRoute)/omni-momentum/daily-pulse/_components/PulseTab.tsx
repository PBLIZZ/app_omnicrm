"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { TrendingUp, Heart, Sparkles, Target } from "lucide-react";
import { usePulse } from "@/hooks/use-pulse";

/**
 * Pulse Tab Component
 *
 * Shows:
 * - Mood timeline graph
 * - Recent journal entries
 * - AI suggestions and insights
 * - Personal and business goals
 */
export function PulseTab(): JSX.Element {
  const { pulseLogs, isLoadingLogs } = usePulse({ limit: 30 });

  if (isLoadingLogs) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your wellness data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mood Trend Overview */}
      <Card className="bg-gradient-to-br from-sky-50 to-teal-50 border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Mood Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pulseLogs.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No pulse entries yet</p>
              <p className="text-sm text-gray-500">
                Start capturing your daily feelings to see trends and patterns
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-2xl font-bold text-teal-600 mb-2">{pulseLogs.length} entries</p>
              <p className="text-sm text-gray-600">Captured in the last 30 days</p>
              {/* TODO: Add mood trend line chart here */}
              <div className="mt-6 p-4 bg-white/50 rounded-lg">
                <p className="text-sm text-gray-500 italic">
                  📊 Mood visualization coming soon - showing your emotional journey over time
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Journal Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Recent Journal Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pulseLogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No journal entries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pulseLogs.slice(0, 5).map((log) => {
                const details = log.details as { mood?: number; energy?: number; notes?: string };
                const moodEmojis = ["😫", "😔", "😐", "😊", "🤩"];
                const moodEmoji = details.mood ? moodEmojis[details.mood - 1] : "😐";

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{moodEmoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(log.logDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-xs text-gray-500">
                            Energy: {details.energy ?? 3}/5
                          </span>
                        </div>
                        {details.notes && (
                          <p className="text-sm text-gray-700">{details.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals Section */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Personal & Business Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 italic">
              🎯 Goals tracking coming soon - track your personal wellness and business growth goals
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

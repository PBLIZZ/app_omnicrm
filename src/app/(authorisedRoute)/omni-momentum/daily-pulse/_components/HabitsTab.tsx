"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Flame, Calendar, Award, TrendingUp } from "lucide-react";
import { useHabits } from "@/hooks/use-habits";

/**
 * Habits Tab Component
 *
 * Shows:
 * - Current streaks for all habits
 * - Completion heatmap (GitHub-style calendar)
 * - Habit achievements and milestones
 * - Completion rate trends
 */
export function HabitsTab(): JSX.Element {
  const { habits, habitCompletions, isLoadingHabits, isLoadingCompletions } = useHabits({
    filters: { isActive: true },
  });

  const isLoading = isLoadingHabits || isLoadingCompletions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your habits data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Streak Overview */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-600" />
            Current Streaks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {habits.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No habits yet</p>
              <p className="text-sm text-gray-500">
                Start tracking habits to build streaks and see your progress
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {habits.map((habit) => (
                <div
                  key={habit.id}
                  className="p-4 rounded-lg border border-emerald-200 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{habit.name}</h4>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100">
                      <Flame className="w-3 h-3 text-orange-600" />
                      <span className="text-xs font-semibold text-orange-700">0</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {/* TODO: Calculate completion rate */}
                    Completion rate: ---%
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Completion Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 italic">
              📅 GitHub-style heatmap coming soon - visualize your consistency at a glance
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-600" />
            Achievements & Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 italic">
              🏆 Achievements system coming soon - celebrate your wellness milestones
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Completion Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mb-4">
              <p className="text-2xl font-bold text-emerald-600 mb-1">
                {habitCompletions.length}
              </p>
              <p className="text-sm text-gray-600">Habits completed today</p>
            </div>
            <p className="text-sm text-gray-500 italic">
              📈 Weekly and monthly trends coming soon
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

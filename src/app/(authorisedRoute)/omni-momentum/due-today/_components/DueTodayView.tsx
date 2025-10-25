"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CalendarClock, CheckCircle2, Circle } from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { useZones } from "@/hooks/use-zones";

/**
 * DueTodayView Component
 *
 * Displays all tasks due today in a clean list view.
 * Filters tasks by due date matching today's date.
 */
export function DueTodayView(): JSX.Element {
  const { data: allTasks, isLoading } = useTasks();
  const { zones } = useZones();

  // Filter tasks due today
  const dueTodayTasks = useMemo(() => {
    if (!allTasks) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allTasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime();
    });
  }, [allTasks]);

  const getZoneColor = (zoneId: number | null): string => {
    if (!zoneId) return "#6366F1";
    const zone = zones.find((z) => z.id === zoneId);
    return zone?.color || "#6366F1";
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <CalendarClock className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Due Today</h1>
        </div>
        <p className="text-gray-600">Tasks that need your attention today</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Today's Tasks</span>
            <span className="text-sm font-normal text-gray-500">
              {dueTodayTasks.length} {dueTodayTasks.length === 1 ? "task" : "tasks"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-pulse">Loading tasks...</div>
            </div>
          ) : dueTodayTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="text-sm">No tasks due today</p>
              <p className="text-xs text-gray-400 mt-1">You're all caught up! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dueTodayTasks.map((task) => (
                <button
                  key={task.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Status Icon */}
                  {task.status === "done" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}

                  {/* Zone Color Indicator */}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getZoneColor(task.zoneId) }}
                  />

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        task.status === "done" ? "line-through text-gray-500" : "text-gray-900"
                      }`}
                    >
                      {task.name}
                    </p>
                  </div>

                  {/* Priority Indicator */}
                  {task.priority === "high" && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-orange-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

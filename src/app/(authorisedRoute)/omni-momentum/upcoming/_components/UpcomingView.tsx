"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CalendarDays, CheckCircle2, Circle, Calendar } from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { useZones } from "@/hooks/use-zones";

/**
 * UpcomingView Component
 *
 * Displays all tasks due in the next 7 days, grouped by date.
 * Helps users plan ahead and see what's coming up.
 */
export function UpcomingView(): JSX.Element {
  const { data: allTasks, isLoading } = useTasks();
  const { zones } = useZones();

  // Filter tasks due in the next 7 days
  const upcomingTasks = useMemo(() => {
    if (!allTasks) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return allTasks
      .filter((task) => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate > today && taskDate <= sevenDaysFromNow;
      })
      .sort((a, b) => {
        const dateA = new Date(a.dueDate!);
        const dateB = new Date(b.dueDate!);
        return dateA.getTime() - dateB.getTime();
      });
  }, [allTasks]);

  const getZoneColor = (zoneId: number | null): string => {
    if (!zoneId) return "#6366F1";
    const zone = zones.find((z) => z.uuidId === zoneId);
    return zone?.color || "#6366F1";
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    }

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <CalendarDays className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Upcoming</h1>
        </div>
        <p className="text-gray-600">Tasks due in the next 7 days</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Next Week</span>
            <span className="text-sm font-normal text-gray-500">
              {upcomingTasks.length} {upcomingTasks.length === 1 ? "task" : "tasks"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-pulse">Loading tasks...</div>
            </div>
          ) : upcomingTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="text-sm">No upcoming tasks</p>
              <p className="text-xs text-gray-400 mt-1">Your schedule is clear! ✨</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
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
                    style={{ backgroundColor: getZoneColor(task.zoneUuid) }}
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

                  {/* Due Date */}
                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(task.dueDate)}
                    </div>
                  )}

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

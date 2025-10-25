"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, Sparkles, Clock, Flag, CheckCircle2 } from "lucide-react";
import { useZones } from "@/hooks/use-zones";
import { useMomentum } from "@/hooks/use-momentum";
import type { Task } from "@/server/db/schema";

const MAX_ZONES_DISPLAYED = 6;

/**
 * WellnessZoneStatus - Shows current status of different life-business zones
 *
 * Displays zones with task counts and activity status to help practitioners
 * see which areas of their life need attention.
 */
export function WellnessZoneStatus(): JSX.Element {
  const { zones, isLoading } = useZones();
  const { tasks, projects } = useMomentum();
  const [selectedZone, setSelectedZone] = useState<{ id: number; name: string } | null>(null);

  const getZoneTasks = (zoneId: number): Task[] => {
    // Get tasks that belong directly to this zone OR belong to projects in this zone
    return tasks.filter((task) => {
      // Direct zone assignment
      if (task.zoneId === zoneId && task.status !== "done") {
        return true;
      }

      // Or through a project in this zone
      if (task.projectId) {
        const project = projects.find((p) => p.id === task.projectId);
        if (project?.zoneId === zoneId && task.status !== "done") {
          return true;
        }
      }

      return false;
    });
  };

  const getZoneTaskCount = (zoneId: number): number => {
    return getZoneTasks(zoneId).length;
  };

  const getZoneStatus = (zoneId: number): string => {
    const taskCount = getZoneTaskCount(zoneId);
    if (taskCount === 0) return "clear";
    if (taskCount <= 2) return "light";
    if (taskCount <= 5) return "moderate";
    return "busy";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "clear":
        return "bg-green-100 text-green-800 border-green-200";
      case "light":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "moderate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "busy":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "clear":
        return "All Clear";
      case "light":
        return "Light Activity";
      case "moderate":
        return "Moderate";
      case "busy":
        return "High Activity";
      default:
        return "Unknown";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-sky-50 via-emerald-50 to-teal-50 border-sky-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            Wellness Zone Status
          </CardTitle>
          <CardDescription>
            Active tasks across your life zones - see where your energy is flowing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-sky-50 via-emerald-50 to-teal-50 border-sky-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          Wellness Zone Status
        </CardTitle>
        <CardDescription>
          Active tasks across your life zones - see where your energy is flowing
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.slice(0, MAX_ZONES_DISPLAYED).map((zone) => {
            const taskCount = getZoneTaskCount(zone.id);
            const status = getZoneStatus(zone.id);
            return (
              <div
                key={zone.id}
                className="p-4 bg-white rounded-lg border hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedZone({ id: zone.id, name: zone.name })}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">{zone.name}</h4>
                    <p className="text-xs text-gray-600">
                      {taskCount} {taskCount === 1 ? "task" : "tasks"} active
                    </p>
                  </div>
                  <Badge className={`text-xs border ${getStatusColor(status)}`}>
                    {getStatusLabel(status)}
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      status === "clear"
                        ? "bg-green-500"
                        : status === "light"
                          ? "bg-blue-500"
                          : status === "moderate"
                            ? "bg-yellow-500"
                            : "bg-orange-500"
                    }`}
                    style={{
                      width: `${Math.min((taskCount / 10) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {!isLoading && zones.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-600 font-medium mb-2">No zones configured yet</p>
              <p className="text-xs text-gray-500">
                Zones are automatically available. If you see this message, contact support.
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Zone Detail Modal */}
      <Dialog open={!!selectedZone} onOpenChange={() => setSelectedZone(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              {selectedZone?.name} Tasks
            </DialogTitle>
            <DialogDescription>
              All active tasks in this zone - work efficiently by tackling related tasks together
            </DialogDescription>
          </DialogHeader>

          {selectedZone && (
            <div className="space-y-4">
              {(() => {
                const zoneTasks = getZoneTasks(selectedZone.id);

                if (zoneTasks.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h3 className="font-medium text-gray-900 mb-2">All Clear!</h3>
                      <p className="text-gray-500 text-sm">
                        No active tasks in this zone. Great job staying on top of things!
                      </p>
                    </div>
                  );
                }

                // Group tasks by priority
                const highPriority = zoneTasks.filter((task) => task.priority === "high");
                const mediumPriority = zoneTasks.filter((task) => task.priority === "medium");
                const lowPriority = zoneTasks.filter((task) => task.priority === "low");
                const noPriority = zoneTasks.filter((task) => !task.priority);

                return (
                  <div className="space-y-6">
                    {/* High Priority Tasks */}
                    {highPriority.length > 0 && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-red-600 mb-3">
                          <Flag className="w-4 h-4" />
                          High Priority ({highPriority.length})
                        </h4>
                        <div className="space-y-2">
                          {highPriority.map((task) => (
                            <div
                              key={task.id}
                              className="p-3 bg-red-50 border border-red-200 rounded-lg"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{task.name}</h5>
                                  {task.dueDate && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                  High
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medium Priority Tasks */}
                    {mediumPriority.length > 0 && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-orange-600 mb-3">
                          <Flag className="w-4 h-4" />
                          Medium Priority ({mediumPriority.length})
                        </h4>
                        <div className="space-y-2">
                          {mediumPriority.map((task) => (
                            <div
                              key={task.id}
                              className="p-3 bg-orange-50 border border-orange-200 rounded-lg"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{task.name}</h5>
                                  {task.dueDate && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                  Medium
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Low Priority Tasks */}
                    {lowPriority.length > 0 && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-600 mb-3">
                          <Flag className="w-4 h-4" />
                          Low Priority ({lowPriority.length})
                        </h4>
                        <div className="space-y-2">
                          {lowPriority.map((task) => (
                            <div
                              key={task.id}
                              className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{task.name}</h5>
                                  {task.dueDate && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  Low
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Priority Tasks */}
                    {noPriority.length > 0 && (
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-3">
                          <Clock className="w-4 h-4" />
                          No Priority Set ({noPriority.length})
                        </h4>
                        <div className="space-y-2">
                          {noPriority.map((task) => (
                            <div
                              key={task.id}
                              className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{task.name}</h5>
                                  {task.dueDate && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                                  No Priority
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

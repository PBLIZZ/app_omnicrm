"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@/components/ui";
import { Progress } from "@/components/ui/progress";
import {
  FolderOpen,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Target,
  ArrowLeft,
  MoreVertical,
} from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { useZones } from "@/hooks/use-zones";
import type { Project } from "@/server/db/schema";

interface ProjectViewProps {
  project: Project;
}

/**
 * ProjectView Component
 *
 * Displays project details similar to a task card with subtasks,
 * but here the project contains tasks instead.
 *
 * Features:
 * - Project header with name, description, zone
 * - Progress bar showing X of Y tasks completed
 * - Task list with status indicators
 * - Add new task button
 * - Edit/delete project actions
 */
export function ProjectView({ project }: ProjectViewProps): JSX.Element {
  const router = useRouter();
  const { data: allTasks } = useTasks();
  const { zones } = useZones();

  // Filter tasks for this project
  const projectTasks = allTasks?.filter((task) => task.projectId === project.id) || [];
  const completedTasks = projectTasks.filter((task) => task.status === "done");
  const progressPercentage =
    projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;

  // Get zone info
  const zone = zones.find((z) => z.id === project.zoneId);

  const handleBack = (): void => {
    router.push("/omni-momentum");
  };

  const handleAddTask = (): void => {
    // TODO: Open task creation modal/sheet
    console.log("Add task to project:", project.id);
  };

  const handleTaskClick = (taskId: string): void => {
    // TODO: Open task detail sheet
    console.log("Open task:", taskId);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Back Button */}
      <Button variant="ghost" onClick={handleBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to OmniMomentum
      </Button>

      {/* Project Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <FolderOpen className="w-8 h-8 text-blue-500 mt-1" />
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{project.name}</CardTitle>

                {/* Zone Badge */}
                {zone && (
                  <div className="mt-3">
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: zone.color ?? undefined,
                        color: zone.color ?? undefined,
                      }}
                    >
                      <Target className="w-3 h-3 mr-1" />
                      {zone.name}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Project Actions */}
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Section */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">
                {completedTasks.length} of {projectTasks.length} tasks completed
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardHeader>

        <CardContent>
          {/* Task List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tasks</h3>
              <Button onClick={handleAddTask} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>

            {projectTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Circle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No tasks yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Create your first task to get started
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {projectTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => handleTaskClick(task.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Status Icon */}
                    {task.status === "done" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          task.status === "done"
                            ? "line-through text-gray-500"
                            : "text-gray-900"
                        }`}
                      >
                        {task.name}
                      </p>
                    </div>

                    {/* Due Date */}
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

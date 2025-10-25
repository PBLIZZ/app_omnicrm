"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreHorizontal } from "lucide-react";
import { useMomentum } from "@/hooks/use-momentum";
import { useZones } from "@/hooks/use-zones";
import type { Project, Task } from "@/server/db/schema";
import type { Zone } from "@/server/db/business-schemas";

interface ProjectsSidebarProps {
  onTaskSelect?: (task: Task) => void;
  onProjectSelect?: (project: Project) => void;
}

interface ProjectWithTasks extends Project {
  tasks: Task[];
  subtasks: Task[];
}

/**
 * ProjectsSidebar - Collapsible project tree for sidebar
 *
 * Features:
 * - Collapsible tree structure (Project → Tasks → Subtasks)
 * - Local state persistence (localStorage)
 * - Drag-and-drop support (future enhancement)
 * - Task count indicators
 * - Zone color coding
 */
export function ProjectsSidebar({
  onTaskSelect,
  onProjectSelect,
}: ProjectsSidebarProps): JSX.Element {
  const { projects, tasks } = useMomentum();
  const { zones } = useZones();

  // Local state for expanded/collapsed projects
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Load expanded state from localStorage on mount
  useEffect(() => {
    const savedExpandedProjects = localStorage.getItem("omnimomentum-expanded-projects");
    const savedExpandedTasks = localStorage.getItem("omnimomentum-expanded-tasks");

    if (savedExpandedProjects) {
      try {
        setExpandedProjects(new Set(JSON.parse(savedExpandedProjects)));
      } catch (error) {
        console.warn("Failed to parse expanded projects from localStorage:", error);
      }
    }

    if (savedExpandedTasks) {
      try {
        setExpandedTasks(new Set(JSON.parse(savedExpandedTasks)));
      } catch (error) {
        console.warn("Failed to parse expanded tasks from localStorage:", error);
      }
    }
  }, []);

  // Save expanded state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("omnimomentum-expanded-projects", JSON.stringify([...expandedProjects]));
  }, [expandedProjects]);

  useEffect(() => {
    localStorage.setItem("omnimomentum-expanded-tasks", JSON.stringify([...expandedTasks]));
  }, [expandedTasks]);

  // Group tasks by project and create hierarchy
  const projectsWithTasks: ProjectWithTasks[] = projects.map((project) => {
    const projectTasks = tasks.filter(
      (task) => task.projectId === project.id && !task.parentTaskId,
    );
    const projectSubtasks = tasks.filter(
      (task) => task.projectId === project.id && task.parentTaskId,
    );

    return {
      ...project,
      tasks: projectTasks,
      subtasks: projectSubtasks,
    };
  });

  const toggleProjectExpanded = (projectId: string): void => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const toggleTaskExpanded = (taskId: string): void => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getZoneColor = (zoneId: number | null): string => {
    if (!zoneId) return "#6366F1";
    const zone = zones.find((z) => z.id === zoneId);
    return zone?.color || "#6366F1";
  };

  const getTaskCount = (project: ProjectWithTasks): number => {
    return project.tasks.length + project.subtasks.length;
  };

  const getCompletedTaskCount = (project: ProjectWithTasks): number => {
    return (
      project.tasks.filter((task) => task.status === "done").length +
      project.subtasks.filter((task) => task.status === "done").length
    );
  };

  const getTaskSubtasks = (taskId: string): Task[] => {
    return tasks.filter((task) => task.parentTaskId === taskId);
  };

  const getTaskCompletedSubtasks = (taskId: string): number => {
    return tasks.filter((task) => task.parentTaskId === taskId && task.status === "done").length;
  };

  if (projects.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Folder className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No projects yet</p>
        <p className="text-xs text-gray-400 mt-1">Create your first project to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {projectsWithTasks.map((project) => {
        const isExpanded = expandedProjects.has(project.id);
        const taskCount = getTaskCount(project);
        const completedCount = getCompletedTaskCount(project);
        const progressPercentage = taskCount > 0 ? (completedCount / taskCount) * 100 : 0;

        return (
          <div key={project.id} className="space-y-1">
            {/* Project Header */}
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleProjectExpanded(project.id)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}

                <button
                  onClick={() => onProjectSelect?.(project)}
                  className="flex-1 text-left text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors truncate"
                >
                  {project.name}
                </button>
              </div>

              {/* Task Count Badge */}
              {taskCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>
                    {completedCount}/{taskCount}
                  </span>
                  <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Project Actions */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>

            {/* Project Tasks */}
            {isExpanded && (
              <div className="ml-6 space-y-1">
                {project.tasks.map((task) => {
                  const isTaskExpanded = expandedTasks.has(task.id);
                  const taskSubtasks = getTaskSubtasks(task.id);
                  const completedSubtasks = getTaskCompletedSubtasks(task.id);
                  const subtaskProgressPercentage =
                    taskSubtasks.length > 0 ? (completedSubtasks / taskSubtasks.length) * 100 : 0;

                  return (
                    <div key={task.id} className="space-y-1">
                      {/* Task Item */}
                      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        {taskSubtasks.length > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTaskExpanded(task.id)}
                            className="h-5 w-5 p-0"
                          >
                            {isTaskExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </Button>
                        ) : (
                          <div className="w-5" />
                        )}

                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Zone Color Indicator */}
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getZoneColor(task.zoneId) }}
                          />

                          <button
                            onClick={() => onTaskSelect?.(task)}
                            className={`flex-1 text-left text-sm transition-colors truncate ${
                              task.status === "done"
                                ? "line-through text-gray-500"
                                : "text-gray-700 hover:text-blue-600"
                            }`}
                          >
                            {task.name}
                          </button>
                        </div>

                        {/* Subtask Count */}
                        {taskSubtasks.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span>
                              {completedSubtasks}/{taskSubtasks.length}
                            </span>
                            <div className="w-6 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${subtaskProgressPercentage}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Priority Badge */}
                        {task.priority === "high" || task.priority === "urgent" ? (
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              task.priority === "urgent" ? "bg-red-500" : "bg-orange-500"
                            }`}
                          />
                        ) : null}
                      </div>

                      {/* Subtasks */}
                      {isTaskExpanded && taskSubtasks.length > 0 && (
                        <div className="ml-6 space-y-1">
                          {taskSubtasks.map((subtask) => (
                            <div
                              key={subtask.id}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="w-5" />

                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: getZoneColor(subtask.zoneId) }}
                                />

                                <button
                                  onClick={() => onTaskSelect?.(subtask)}
                                  className={`flex-1 text-left text-xs transition-colors truncate ${
                                    subtask.status === "done"
                                      ? "line-through text-gray-400"
                                      : "text-gray-600 hover:text-blue-600"
                                  }`}
                                >
                                  {subtask.name}
                                </button>
                              </div>

                              {/* Subtask Priority */}
                              {subtask.priority === "high" || subtask.priority === "urgent" ? (
                                <div
                                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    subtask.priority === "urgent" ? "bg-red-500" : "bg-orange-500"
                                  }`}
                                />
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Task Button */}
                <div className="ml-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Add Task
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

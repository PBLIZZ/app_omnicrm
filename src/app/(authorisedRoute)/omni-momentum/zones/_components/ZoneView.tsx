"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  Filter,
  SortAsc,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useMomentum } from "@/hooks/use-momentum";
import { TaskCard } from "../../_components/TaskCard";
import type { Zone } from "@/server/db/schema";

interface ZoneViewProps {
  zone: Zone;
}

/**
 * Zone View - Dedicated workspace for a specific life-business zone
 *
 * Features:
 * - All tasks in this zone with full management
 * - Zone-specific analytics and progress tracking
 * - Focused task creation and editing
 * - Context switching for efficiency
 */
export function ZoneView({ zone }: ZoneViewProps): JSX.Element {
  const { tasks, projects } = useMomentum();
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low" | "no-priority">("all");
  const [sortBy, setSortBy] = useState<"priority" | "due-date" | "created">("priority");

  // Get all tasks in this zone
  const zoneTasks = tasks.filter((task) => {
    // Direct zone assignment
    if (task.zoneUuid === zone.uuidId && task.status !== "done") {
      return true;
    }

    // Or through a project in this zone
    if (task.projectId) {
      const project = projects.find((p) => p.id === task.projectId);
      if (project?.zoneUuid === zone.uuidId && task.status !== "done") {
        return true;
      }
    }

    return false;
  });

  // Filter tasks based on selected filter
  const filteredTasks = zoneTasks.filter((task) => {
    switch (filter) {
      case "high":
        return task.priority === "high";
      case "medium":
        return task.priority === "medium";
      case "low":
        return task.priority === "low";
      case "no-priority":
        return !task.priority;
      default:
        return true;
    }
  });

  // Sort tasks based on selected sort
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case "priority":
        const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        return bPriority - aPriority;
      case "due-date":
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case "created":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  // Calculate zone statistics
  const totalTasks = zoneTasks.length;
  const highPriorityTasks = zoneTasks.filter((task) => task.priority === "high").length;
  const overdueTasks = zoneTasks.filter((task) => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  }).length;

  const getZoneColor = (zone: Zone) => {
    return zone.color || "#6366f1";
  };

  const getZoneIcon = (zone: Zone) => {
    return zone.iconName || "target";
  };

  return (
    <div className="space-y-6">
      {/* Zone Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/omni-momentum">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: getZoneColor(zone) }}
            >
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{zone.name}</h1>
              <p className="text-gray-600">Focused workspace for {zone.name.toLowerCase()}</p>
            </div>
          </div>
        </div>

        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* Zone Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-gray-900">{highPriorityTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{overdueTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalTasks > 0
                    ? Math.round(((totalTasks - overdueTasks) / totalTasks) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="all">All Tasks</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                  <option value="no-priority">No Priority</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <SortAsc className="w-4 h-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="priority">Sort by Priority</option>
                  <option value="due-date">Sort by Due Date</option>
                  <option value="created">Sort by Created</option>
                </select>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              {sortedTasks.length} of {totalTasks} tasks
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Grid */}
      {sortedTasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === "all" ? "No tasks in this zone" : `No ${filter} priority tasks`}
            </h3>
            <p className="text-gray-500 mb-4">
              {filter === "all"
                ? "This zone is all clear! Add some tasks to get started."
                : "Try changing the filter to see other tasks."}
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={() => {
                // TODO: Implement task completion
                console.log("Toggle task:", task.id);
              }}
              onExpand={() => {
                // TODO: Implement task expansion
                console.log("Expand task:", task.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

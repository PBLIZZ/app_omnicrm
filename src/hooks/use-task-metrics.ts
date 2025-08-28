// Task metrics and calculations hook
// Handles urgency, priority, Eisenhower matrix calculations
// Max 150 lines as per architecture rules

import { useMemo } from "react";
import { 
  calculateUrgency,
  calculateEisenhowerQuadrant,
  calculateCompletionPercentage,
  enhanceTask,
  type EnhancedTask
} from "@/lib/task-utils";
import type { Task } from "@/server/db/schema";

interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  urgentTasks: number;
  averageCompletionTime: number;
  productivityScore: number;
}

interface Contact {
  id: string;
  displayName: string;
}

interface Workspace {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

export function useTaskMetrics(
  tasks: Task[], 
  contacts: Contact[] = [],
  workspaces: Workspace[] = [],
  projects: Project[] = []
) {
  
  // Enhanced tasks with computed fields
  const enhancedTasks: EnhancedTask[] = useMemo(() => {
    return tasks.map(task => enhanceTask(task, contacts, workspaces, projects));
  }, [tasks, contacts, workspaces, projects]);

  // Overall metrics
  const metrics: TaskMetrics = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === "done").length;
    const pendingTasks = totalTasks - completedTasks;
    const overdueTasks = enhancedTasks.filter(task => task.urgency === "overdue").length;
    const dueTodayTasks = enhancedTasks.filter(task => task.urgency === "due_today").length;
    const urgentTasks = tasks.filter(task => task.priority === "urgent" || task.priority === "high").length;

    // Calculate average completion time for completed tasks with actual time
    const tasksWithActualTime = tasks.filter(task => 
      task.status === "done" && task.actualMinutes && task.actualMinutes > 0
    );
    const averageCompletionTime = tasksWithActualTime.length > 0
      ? tasksWithActualTime.reduce((sum, task) => sum + (task.actualMinutes || 0), 0) / tasksWithActualTime.length
      : 0;

    // Simple productivity score (0-100)
    // Based on: completion rate, overdue prevention, time estimation accuracy
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const overdueRate = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;
    const productivityScore = Math.max(0, Math.min(100, completionRate - overdueRate));

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      dueTodayTasks,
      urgentTasks,
      averageCompletionTime: Math.round(averageCompletionTime),
      productivityScore: Math.round(productivityScore),
    };
  }, [tasks, enhancedTasks]);

  // Tasks grouped by Eisenhower quadrants
  const eisenhowerQuadrants = useMemo(() => {
    const quadrants = {
      1: enhancedTasks.filter(task => task.eisenhowerQuadrant === 1), // Do First
      2: enhancedTasks.filter(task => task.eisenhowerQuadrant === 2), // Schedule
      3: enhancedTasks.filter(task => task.eisenhowerQuadrant === 3), // Delegate
      4: enhancedTasks.filter(task => task.eisenhowerQuadrant === 4), // Eliminate
    };

    return quadrants;
  }, [enhancedTasks]);

  // Today's focus tasks (top 3 priorities)
  const todaysFocus = useMemo(() => {
    return enhancedTasks
      .filter(task => task.status !== "done" && task.status !== "cancelled")
      .sort((a, b) => {
        // Sort by: urgency first, then priority, then creation date
        const urgencyWeight = { overdue: 4, due_today: 3, due_soon: 2, future: 1 };
        const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
        
        const aUrgencyScore = urgencyWeight[a.urgency];
        const bUrgencyScore = urgencyWeight[b.urgency];
        
        if (aUrgencyScore !== bUrgencyScore) {
          return bUrgencyScore - aUrgencyScore;
        }
        
        const aPriorityScore = priorityWeight[a.priority as keyof typeof priorityWeight] || 2;
        const bPriorityScore = priorityWeight[b.priority as keyof typeof priorityWeight] || 2;
        
        if (aPriorityScore !== bPriorityScore) {
          return bPriorityScore - aPriorityScore;
        }
        
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 3);
  }, [enhancedTasks]);

  // Task distribution by status
  const statusDistribution = useMemo(() => {
    const distribution = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return distribution;
  }, [tasks]);

  // Task distribution by priority
  const priorityDistribution = useMemo(() => {
    const distribution = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return distribution;
  }, [tasks]);

  return {
    enhancedTasks,
    metrics,
    eisenhowerQuadrants,
    todaysFocus,
    statusDistribution,
    priorityDistribution,
  };
}
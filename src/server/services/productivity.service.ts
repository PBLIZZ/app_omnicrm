/**
 * Productivity Service Layer
 *
 * Main entry point for productivity services.
 * Re-exports all project and task services.
 */

// Re-export all project services
export * from "./projects.service";

// Re-export all task services
export * from "./tasks.service";

// Explicitly export key task services for API routes
export {
  getProjectTasksService,
  getPendingApprovalTasksService,
  approveTaskService,
  rejectTaskService,
  getSubtasksService,
} from "./tasks.service";

// Re-export zones service (already exists separately)
export * from "./zones.service";

// ============================================================================
// UI ENRICHMENT MAPPERS (moved from schemas per architecture blueprint)
// ============================================================================

import type { Task, Project, Zone } from "@/server/db/schema";
import type { ZoneStats } from "@/server/db/business-schemas/productivity";

/**
 * Map database task to UI-enriched task
 * Adds computed fields for frontend display
 */
export function mapToTaskWithUI(task: Task): Task & {
  isCompleted: boolean;
  isOverdue: boolean;
  isDueToday: boolean;
  isHighPriority: boolean;
  hasSubtasks: boolean;
} {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    ...task,
    isCompleted: task.status === "done",
    isOverdue: dueDate ? dueDate < new Date() && task.status !== "done" : false,
    isDueToday: dueDate ? dueDate.toDateString() === new Date().toDateString() : false,
    isHighPriority: ["high", "urgent"].includes(task.priority),
    hasSubtasks: false, // Would be computed via join query in repository layer
  };
}

/**
 * Map database project to UI-enriched project
 */
export function mapToProjectWithUI(project: Project): Project & {
  isActive: boolean;
  isCompleted: boolean;
  isOverdue: boolean;
  taskCount: number;
} {
  const dueDate = project.dueDate ? new Date(project.dueDate) : null;

  return {
    ...project,
    isActive: project.status === "active",
    isCompleted: project.status === "completed",
    isOverdue: dueDate ? dueDate < new Date() && project.status !== "completed" : false,
    taskCount: 0, // Would be computed via join query in repository layer
  };
}

/**
 * Map database zone to UI-enriched zone
 */
export function mapToZoneWithUI(zone: Zone): Zone & {
  icon: string | null;
  displayName: string;
  hasIcon: boolean;
  hasColor: boolean;
} {
  return {
    ...zone,
    icon: zone.iconName,
    displayName: zone.name,
    hasIcon: Boolean(zone.iconName),
    hasColor: Boolean(zone.color),
  };
}

/**
 * Map database zone with stats to UI-enriched zone with stats
 */
export function mapToZoneWithStats(
  zone: Zone,
  stats: ZoneStats,
): Zone &
  ZoneStats & {
    hasActiveWork: boolean;
    hasCompletedWork: boolean;
    hasRecentActivity: boolean;
    workloadLevel: "none" | "light" | "moderate" | "heavy";
  } {
  const baseZone = mapToZoneWithUI(zone);
  const total = stats.activeProjects + stats.activeTasks;

  let workloadLevel: "none" | "light" | "moderate" | "heavy" = "none";
  if (total > 0) {
    if (total <= 3) workloadLevel = "light";
    else if (total <= 8) workloadLevel = "moderate";
    else workloadLevel = "heavy";
  }

  return {
    ...baseZone,
    ...stats,
    hasActiveWork: stats.activeProjects > 0 || stats.activeTasks > 0,
    hasCompletedWork: stats.completedProjects > 0 || stats.completedTasks > 0,
    hasRecentActivity: stats.lastActivity
      ? Date.now() - stats.lastActivity.getTime() < 7 * 24 * 60 * 60 * 1000
      : false,
    workloadLevel,
  };
}

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use individual service functions instead
 * This is kept for backward compatibility during migration
 */
export interface TaskWithRelationsDTO extends Task {
  project?: Project | null;
  parentTask?: Task | null;
  subtasks: Task[];
  taggedContacts: Array<{ id: string; name: string }>;
  zone?: Zone | null;
}

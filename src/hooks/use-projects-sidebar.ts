import { useState, useEffect } from "react";
import { useMomentum } from "@/hooks/use-momentum";
import { useZones } from "@/hooks/use-zones";
import type { Project, Task } from "@/server/db/schema";
import type { Zone } from "@/server/db/business-schemas";

// ============================================================================
// TYPES
// ============================================================================

interface ProjectWithTasks extends Project {
  tasks: Task[];
  subtasks: Task[];
  taskCount: number;
  completedTaskCount: number;
  progressPercentage: number;
}

interface ProjectsSidebarState {
  expandedProjects: Set<string>;
  expandedTasks: Set<string>;
  selectedProject: Project | null;
  selectedTask: Task | null;
}

interface UseProjectsSidebarReturn {
  // Data
  projectsWithTasks: ProjectWithTasks[];
  zones: Zone[];

  // State
  expandedProjects: Set<string>;
  expandedTasks: Set<string>;
  selectedProject: Project | null;
  selectedTask: Task | null;

  // Actions
  toggleProjectExpanded: (projectId: string) => void;
  toggleTaskExpanded: (taskId: string) => void;
  selectProject: (project: Project | null) => void;
  selectTask: (task: Task | null) => void;
  expandAllProjects: () => void;
  collapseAllProjects: () => void;
  expandAllTasks: () => void;
  collapseAllTasks: () => void;

  // Utilities
  getProjectTasks: (projectId: string) => Task[];
  getTaskSubtasks: (taskId: string) => Task[];
  getProjectProgress: (projectId: string) => number;
  getTaskProgress: (taskId: string) => number;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Manage a collapsible projects-and-tasks sidebar state and provide utilities for project/task data and progress.
 *
 * Persists expanded project and task sets to localStorage, exposes selection state, and computes task/subtask counts
 * and progress percentages based on tasks and embedded subtasks.
 *
 * @returns An object containing grouped project data (`projectsWithTasks`), `zones`, UI state (`expandedProjects`, `expandedTasks`, `selectedProject`, `selectedTask`), action methods to toggle/select/expand/collapse projects and tasks, and utility functions (`getProjectTasks`, `getTaskSubtasks`, `getProjectProgress`, `getTaskProgress`) for querying tasks, subtasks, and progress.
 */
export function useProjectsSidebar(): UseProjectsSidebarReturn {
  const { projects, tasks } = useMomentum();
  const { zones } = useZones();

  // Local state for expanded/collapsed projects and tasks
  const [state, setState] = useState<ProjectsSidebarState>({
    expandedProjects: new Set(),
    expandedTasks: new Set(),
    selectedProject: null,
    selectedTask: null,
  });

  // Load expanded state from localStorage on mount
  useEffect(() => {
    const savedExpandedProjects = localStorage.getItem("omnimomentum-expanded-projects");
    const savedExpandedTasks = localStorage.getItem("omnimomentum-expanded-tasks");

    if (savedExpandedProjects) {
      try {
        const parsedProjects = JSON.parse(savedExpandedProjects);
        setState((prev) => ({
          ...prev,
          expandedProjects: new Set(parsedProjects),
        }));
      } catch (error) {
        console.warn("Failed to parse expanded projects from localStorage:", error);
      }
    }

    if (savedExpandedTasks) {
      try {
        const parsedTasks = JSON.parse(savedExpandedTasks);
        setState((prev) => ({
          ...prev,
          expandedTasks: new Set(parsedTasks),
        }));
      } catch (error) {
        console.warn("Failed to parse expanded tasks from localStorage:", error);
      }
    }
  }, []);

  // Save expanded state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(
      "omnimomentum-expanded-projects",
      JSON.stringify([...state.expandedProjects]),
    );
  }, [state.expandedProjects]);

  useEffect(() => {
    localStorage.setItem("omnimomentum-expanded-tasks", JSON.stringify([...state.expandedTasks]));
  }, [state.expandedTasks]);

  // Group tasks by project and create hierarchy
  // NOTE: Subtasks are now stored in details.subtasks JSONB array, not as separate task records
  const projectsWithTasks: ProjectWithTasks[] = projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);

    // Count subtasks from JSONB
    const subtaskCount = projectTasks.reduce((count, task) => {
      const details =
        typeof task.details === "object" && task.details !== null
          ? (task.details as Record<string, unknown>)
          : {};
      const subtasks = Array.isArray(details["subtasks"]) ? details["subtasks"] : [];
      return count + subtasks.length;
    }, 0);

    const taskCount = projectTasks.length + subtaskCount;
    const completedCount = projectTasks.filter((task) => task.status === "done").length;
    const progressPercentage = taskCount > 0 ? (completedCount / taskCount) * 100 : 0;

    return {
      ...project,
      tasks: projectTasks,
      subtasks: [], // No longer separate task records
      taskCount,
      completedTaskCount: completedCount,
      progressPercentage,
    };
  });

  // Action functions
  const toggleProjectExpanded = (projectId: string): void => {
    setState((prev) => ({
      ...prev,
      expandedProjects: (() => {
        const newSet = new Set(prev.expandedProjects);
        if (newSet.has(projectId)) {
          newSet.delete(projectId);
        } else {
          newSet.add(projectId);
        }
        return newSet;
      })(),
    }));
  };

  const toggleTaskExpanded = (taskId: string): void => {
    setState((prev) => ({
      ...prev,
      expandedTasks: (() => {
        const newSet = new Set(prev.expandedTasks);
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          newSet.add(taskId);
        }
        return newSet;
      })(),
    }));
  };

  const selectProject = (project: Project | null): void => {
    setState((prev) => ({
      ...prev,
      selectedProject: project,
      selectedTask: null, // Clear task selection when selecting project
    }));
  };

  const selectTask = (task: Task | null): void => {
    setState((prev) => ({
      ...prev,
      selectedTask: task,
      selectedProject: null, // Clear project selection when selecting task
    }));
  };

  const expandAllProjects = (): void => {
    const allProjectIds = new Set(projects.map((p) => p.id));
    setState((prev) => ({
      ...prev,
      expandedProjects: allProjectIds,
    }));
  };

  const collapseAllProjects = (): void => {
    setState((prev) => ({
      ...prev,
      expandedProjects: new Set(),
    }));
  };

  const expandAllTasks = (): void => {
    const allTaskIds = new Set(tasks.map((t) => t.id));
    setState((prev) => ({
      ...prev,
      expandedTasks: allTaskIds,
    }));
  };

  const collapseAllTasks = (): void => {
    setState((prev) => ({
      ...prev,
      expandedTasks: new Set(),
    }));
  };

  // Utility functions
  const getProjectTasks = (projectId: string): Task[] => {
    return tasks.filter((task) => task.projectId === projectId);
  };

  const getTaskSubtasks = (taskId: string): Task[] => {
    // Subtasks are stored in JSONB details.subtasks array, not as separate task records
    const task = tasks.find((t) => t.id === taskId);
    if (!task || typeof task.details !== "object" || task.details === null) {
      return [];
    }
    const details = task.details as Record<string, unknown>;
    const subtasks = Array.isArray(details["subtasks"]) ? details["subtasks"] : [];
    // Convert JSONB subtasks to Task-like objects (though they won't have all Task properties)
    return subtasks as Task[];
  };

  const getProjectProgress = (projectId: string): number => {
    const project = projectsWithTasks.find((p) => p.id === projectId);
    return project?.progressPercentage || 0;
  };

  const getTaskProgress = (taskId: string): number => {
    const taskSubtasks = getTaskSubtasks(taskId);
    if (taskSubtasks.length === 0) return 0;

    const completedSubtasks = taskSubtasks.filter((task) => task.status === "done").length;
    return (completedSubtasks / taskSubtasks.length) * 100;
  };

  return {
    // Data
    projectsWithTasks,
    zones,

    // State
    expandedProjects: state.expandedProjects,
    expandedTasks: state.expandedTasks,
    selectedProject: state.selectedProject,
    selectedTask: state.selectedTask,

    // Actions
    toggleProjectExpanded,
    toggleTaskExpanded,
    selectProject,
    selectTask,
    expandAllProjects,
    collapseAllProjects,
    expandAllTasks,
    collapseAllTasks,

    // Utilities
    getProjectTasks,
    getTaskSubtasks,
    getProjectProgress,
    getTaskProgress,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to get project statistics
 */
export function useProjectStats(projectId: string) {
  const { projectsWithTasks } = useProjectsSidebar();

  const project = projectsWithTasks.find((p) => p.id === projectId);

  return {
    project,
    taskCount: project?.taskCount || 0,
    completedTaskCount: project?.completedTaskCount || 0,
    progressPercentage: project?.progressPercentage || 0,
    isCompleted: project
      ? project.taskCount > 0 && project.completedTaskCount === project.taskCount
      : false,
  };
}

/**
 * Hook to get task statistics
 */
export function useTaskStats(taskId: string) {
  const { getTaskSubtasks, getTaskProgress } = useProjectsSidebar();

  const subtasks = getTaskSubtasks(taskId);
  const progressPercentage = getTaskProgress(taskId);
  const completedSubtasks = subtasks.filter((task) => task.status === "done").length;

  return {
    subtasks,
    subtaskCount: subtasks.length,
    completedSubtaskCount: completedSubtasks,
    progressPercentage,
    isCompleted: subtasks.length > 0 && completedSubtasks === subtasks.length,
  };
}

/**
 * Provide zone lookup and normalized display values for a given zone UUID.
 *
 * @param zoneUuid - The zone's UUID string; pass `null` if no zone is associated
 * @returns An object with:
 *  - `zone` — the matched zone object or `undefined` when no match is found
 *  - `zoneName` — the zone's name or `"No Zone"` when missing
 *  - `zoneColor` — the zone's color or `"#6366F1"` when missing
 *  - `zoneIcon` — the zone's icon name or `"circle"` when missing
 */
export function useZoneInfo(zoneUuid: string | null) {
  const { zones } = useProjectsSidebar();

  const zone = zones.find((z) => z.uuidId === zoneUuid);

  return {
    zone,
    zoneName: zone?.name ?? "No Zone",
    zoneColor: zone?.color ?? "#6366F1",
    zoneIcon: zone?.iconName ?? "circle",
  };
}
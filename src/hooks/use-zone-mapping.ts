// Wellness zone mapping hook
// Manages workspace-to-zone relationships and zone-based filtering
// Max 200 lines as per architecture rules

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  wellnessZones,
  mapWorkspacesToZones,
  getZoneTaskStats,
  getZoneTaskFilter,
  suggestZoneForWorkspace,
  type WellnessZone
} from "@/lib/wellness-zones";
import type { Workspace, Task } from "@/server/db/schema";

interface ZoneWithStats extends WellnessZone {
  taskCount: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  workspaceCount: number;
}

export function useZoneMapping() {
  // Fetch workspaces
  const { data: workspacesResponse, isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ["/api/workspaces"],
    queryFn: async () => {
      return apiRequest("/api/workspaces");
    },
  });

  // Fetch tasks for stats
  const { data: tasksResponse, isLoading: isLoadingTasks } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      return apiRequest("/api/tasks");
    },
  });

  const workspaces: Workspace[] = workspacesResponse?.workspaces || [];
  const tasks: Task[] = tasksResponse?.tasks || [];

  // Map workspaces to zones
  const workspaceZoneMap = useMemo(() => {
    return workspaces.reduce((map, workspace) => {
      map[workspace.id] = suggestZoneForWorkspace(workspace);
      return map;
    }, {} as Record<string, string>);
  }, [workspaces]);

  // Get workspaces with zone assignments
  const workspacesWithZones = useMemo(() => {
    return mapWorkspacesToZones(workspaces);
  }, [workspaces]);

  // Calculate zone statistics
  const zonesWithStats: ZoneWithStats[] = useMemo(() => {
    const taskStats = getZoneTaskStats(
      tasks.map(task => ({ workspaceId: task.workspaceId, status: task.status })),
      workspaceZoneMap
    );

    return wellnessZones.map(zone => {
      const stats = taskStats[zone.id] || { total: 0, completed: 0, pending: 0 };
      const workspaceCount = workspacesWithZones.filter(w => w.zoneId === zone.id).length;
      const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

      return {
        ...zone,
        taskCount: stats.total,
        completedTasks: stats.completed,
        pendingTasks: stats.pending,
        completionRate: Math.round(completionRate),
        workspaceCount,
      };
    });
  }, [workspaceZoneMap, tasks, workspacesWithZones]);

  // Helper to get tasks for a specific zone
  const getTasksForZone = (zoneId: string): Task[] => {
    const filter = getZoneTaskFilter(zoneId, workspaces);
    return tasks.filter(task => filter.workspaceIds.includes(task.workspaceId));
  };

  // Helper to get workspaces for a specific zone
  const getWorkspacesForZone = (zoneId: string): Workspace[] => {
    return workspacesWithZones.filter(workspace => workspace.zoneId === zoneId);
  };

  // Helper to suggest zone for a new workspace
  const suggestZone = (workspaceName: string, description?: string): string => {
    return suggestZoneForWorkspace({ name: workspaceName, description });
  };

  // Get the most active zone (most tasks)
  const getMostActiveZone = (): ZoneWithStats | undefined => {
    return zonesWithStats.reduce((mostActive, zone) => {
      return zone.taskCount > (mostActive?.taskCount || 0) ? zone : mostActive;
    }, undefined as ZoneWithStats | undefined);
  };

  // Get zones that need attention (low completion rate)
  const getZonesNeedingAttention = (threshold: number = 50): ZoneWithStats[] => {
    return zonesWithStats.filter(zone => 
      zone.taskCount > 0 && zone.completionRate < threshold
    );
  };

  // Get balanced zones (good completion rate and active)
  const getBalancedZones = (): ZoneWithStats[] => {
    return zonesWithStats.filter(zone => 
      zone.taskCount > 0 && zone.completionRate >= 70
    );
  };

  // Zone health insights
  const getZoneHealthInsights = () => {
    const mostActive = getMostActiveZone();
    const needingAttention = getZonesNeedingAttention();
    const balanced = getBalancedZones();

    return {
      mostActiveZone: mostActive,
      zonesNeedingAttention: needingAttention,
      balancedZones: balanced,
      overallBalance: balanced.length / Math.max(1, zonesWithStats.filter(z => z.taskCount > 0).length),
    };
  };

  return {
    // Data
    wellnessZones,
    workspaces,
    workspacesWithZones,
    zonesWithStats,
    workspaceZoneMap,
    
    // Helper functions
    getTasksForZone,
    getWorkspacesForZone,
    suggestZone,
    
    // Analytics
    getMostActiveZone,
    getZonesNeedingAttention,
    getBalancedZones,
    getZoneHealthInsights,
    
    // Loading states
    isLoading: isLoadingWorkspaces || isLoadingTasks,
    isLoadingWorkspaces,
    isLoadingTasks,
  };
}
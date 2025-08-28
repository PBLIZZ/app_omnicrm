// Wellness zone definitions and mappings for wellness practitioners
// Maps workspaces and task categories to wellness-focused zones
// Max 200 lines as per architecture rules

import type { Workspace } from "@/server/db/schema";

export interface WellnessZone {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  defaultWorkspaceColor: string;
  suggestedCategories: string[];
  keywords: string[];
}

// Core wellness zones for practitioners
export const wellnessZones: WellnessZone[] = [
  {
    id: "personal-selfcare",
    name: "Personal & Self-Care",
    description: "Personal development, self-care, and practitioner wellness",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: "🧘",
    defaultWorkspaceColor: "#10b981",
    suggestedCategories: ["personal-wellness"],
    keywords: ["self", "personal", "wellness", "care", "health", "meditation", "exercise", "break"],
  },
  {
    id: "client-relationships",
    name: "Client Relationships",
    description: "Direct client care, consultations, and relationship management",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "💙",
    defaultWorkspaceColor: "#3b82f6",
    suggestedCategories: ["client-care"],
    keywords: ["client", "session", "consultation", "care", "treatment", "appointment", "relationship"],
  },
  {
    id: "admin-finance",
    name: "Admin & Finance",
    description: "Administrative tasks, finance, legal, and operations",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: "📋",
    defaultWorkspaceColor: "#6b7280",
    suggestedCategories: ["administrative"],
    keywords: ["admin", "finance", "tax", "insurance", "legal", "paperwork", "accounting", "invoice"],
  },
  {
    id: "business-growth",
    name: "Business Development",
    description: "Marketing, partnerships, growth, and strategic planning",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "📈",
    defaultWorkspaceColor: "#8b5cf6",
    suggestedCategories: ["business-development"],
    keywords: ["business", "growth", "marketing", "partnership", "strategy", "planning", "development"],
  },
  {
    id: "social-media-marketing",
    name: "Social Media & Marketing",
    description: "Content creation, social media, newsletters, and marketing",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: "📱",
    defaultWorkspaceColor: "#f59e0b",
    suggestedCategories: ["content-creation"],
    keywords: ["social", "media", "content", "post", "newsletter", "blog", "marketing", "brand"],
  },
];

// Helper function to suggest zone based on workspace name/description
export function suggestZoneForWorkspace(workspace: { name: string; description?: string | null }): string {
  const text = `${workspace.name} ${workspace.description || ""}`.toLowerCase();
  
  // Find zone with highest keyword match score
  let bestMatch = wellnessZones[0];
  let bestScore = 0;
  
  for (const zone of wellnessZones) {
    const score = zone.keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    ).length;
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = zone;
    }
  }
  
  return bestMatch.id;
}

// Helper function to suggest zone based on task category
export function suggestZoneForCategory(category: string): string {
  const zone = wellnessZones.find(zone => 
    zone.suggestedCategories.includes(category)
  );
  
  return zone?.id || "personal-selfcare";
}

// Helper function to get zone by ID
export function getZoneById(zoneId: string): WellnessZone | undefined {
  return wellnessZones.find(zone => zone.id === zoneId);
}

// Helper function to get zone color classes
export function getZoneColorClasses(zoneId: string): string {
  const zone = getZoneById(zoneId);
  return zone?.color || wellnessZones[0].color;
}

// Helper function to create default workspaces for all zones
export function getDefaultWorkspaces(): Array<{
  name: string;
  description: string;
  color: string;
  isDefault: boolean;
  zoneId: string;
}> {
  return wellnessZones.map(zone => ({
    name: zone.name,
    description: zone.description,
    color: zone.defaultWorkspaceColor,
    isDefault: zone.id === "personal-selfcare", // Make personal/self-care the default
    zoneId: zone.id,
  }));
}

// Helper function to map existing workspaces to zones
export function mapWorkspacesToZones(workspaces: Workspace[]): Array<Workspace & { zoneId: string }> {
  return workspaces.map(workspace => ({
    ...workspace,
    zoneId: suggestZoneForWorkspace(workspace),
  }));
}

// Helper function to get zone statistics for a list of tasks
export function getZoneTaskStats(tasks: Array<{ workspaceId: string; status: string }>, workspaceZoneMap: Record<string, string>) {
  const zoneStats = wellnessZones.reduce((acc, zone) => {
    acc[zone.id] = {
      total: 0,
      completed: 0,
      pending: 0,
    };
    return acc;
  }, {} as Record<string, { total: number; completed: number; pending: number }>);

  tasks.forEach(task => {
    const zoneId = workspaceZoneMap[task.workspaceId] || "personal-selfcare";
    const stats = zoneStats[zoneId];
    
    if (stats) {
      stats.total++;
      if (task.status === "done") {
        stats.completed++;
      } else if (task.status !== "cancelled") {
        stats.pending++;
      }
    }
  });

  return zoneStats;
}

// Helper function to get zone-based task filtering
export function getZoneTaskFilter(zoneId: string, workspaces: Workspace[]) {
  const zoneWorkspaces = workspaces.filter(workspace => 
    suggestZoneForWorkspace(workspace) === zoneId
  );
  
  return {
    workspaceIds: zoneWorkspaces.map(w => w.id),
    zoneName: getZoneById(zoneId)?.name || "Unknown Zone",
  };
}
/**
 * Zone Utilities for OmniMomentum
 *
 * Provides utility functions for zone color coding, management, and filtering.
 */

import type { Zone } from "@/server/db/business-schemas";

// ============================================================================
// ZONE COLORS AND ICONS
// ============================================================================

/**
 * Default wellness zone colors
 */
export const DEFAULT_ZONE_COLORS = [
  "#6366F1", // Indigo - Personal Wellness
  "#8B5CF6", // Purple - Self Care
  "#EC4899", // Pink - Social Media & Marketing
  "#EF4444", // Red - Admin & Finances
  "#F97316", // Orange - Business Development
  "#06B6D4", // Cyan - Client Care
] as const;

/**
 * Available zone icons
 */
export const ZONE_ICONS = [
  "circle",
  "square",
  "triangle",
  "diamond",
  "star",
  "heart",
  "sparkles",
  "target",
  "trending-up",
  "users",
  "calendar",
  "clock",
  "bell",
  "bookmark",
  "flag",
  "tag",
  "folder",
  "file",
  "image",
  "video",
  "music",
  "camera",
  "home",
  "briefcase",
  "shopping-cart",
  "credit-card",
  "phone",
  "mail",
  "message-circle",
  "share",
  "thumbs-up",
  "thumbs-down",
  "book-open",
] as const;

/**
 * Zone categories for filtering
 */
export const ZONE_CATEGORIES = [
  "Personal",
  "Business",
  "Health",
  "Social",
  "Financial",
  "Creative",
  "Learning",
  "Other",
] as const;

// ============================================================================
// ZONE UTILITY FUNCTIONS
// ============================================================================

/**
 * Get zone color by name (with fallback)
 */
export function getZoneColor(zones: Zone[], zoneName: string): string {
  const zone = zones.find((z) => z.name === zoneName);
  return zone?.color || "#6366F1"; // Default indigo color
}

/**
 * Retrieve the icon name for a zone by its name.
 *
 * @param zones - The list of zones to search
 * @param zoneName - The exact zone name to match (case-sensitive)
 * @returns The zone's `iconName` if a matching zone is found and it has an icon, `"circle"` otherwise
 */
export function getZoneIcon(zones: Zone[], zoneName: string): string {
  const zone = zones.find((z) => z.name === zoneName);
  return zone?.iconName || "circle"; // Default circle icon
}

/**
 * Retrieve the zone matching the given UUID.
 *
 * @param zoneUuid - The UUID of the zone to locate
 * @returns The `Zone` with the matching `uuidId`, or `null` if no match is found
 */
export function getZoneById(zones: Zone[], zoneUuid: string): Zone | null {
  return zones.find((z) => z.uuidId === zoneUuid) ?? null;
}

/**
 * Get zone by name
 */
export function getZoneByName(zones: Zone[], zoneName: string): Zone | null {
  return zones.find((z) => z.name === zoneName) || null;
}

/**
 * Check if a zone name is valid
 */
export function isValidZoneName(zoneName: string): boolean {
  return zoneName.trim().length > 0 && zoneName.trim().length <= 100;
}

/**
 * Check if a color is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Check if an icon name is valid
 */
export function isValidIconName(iconName: string): boolean {
  return ZONE_ICONS.includes(iconName as any);
}

// ============================================================================
// ZONE FILTERING AND SEARCH
// ============================================================================

/**
 * Filter zones by search term
 */
export function filterZonesBySearch(zones: Zone[], searchTerm: string): Zone[] {
  if (!searchTerm.trim()) return zones;

  const term = searchTerm.toLowerCase();
  return zones.filter(
    (zone) =>
      zone.name.toLowerCase().includes(term) ||
      (zone.iconName && zone.iconName.toLowerCase().includes(term)),
  );
}

/**
 * Filter zones by category
 */
export function filterZonesByCategory(zones: Zone[], category: string): Zone[] {
  if (category === "all") return zones;

  return zones.filter((zone) => zone.name.toLowerCase().includes(category.toLowerCase()));
}

/**
 * Sort zones by name
 */
export function sortZonesByName(zones: Zone[], direction: "asc" | "desc" = "asc"): Zone[] {
  return [...zones].sort((a, b) => {
    const comparison = a.name.localeCompare(b.name);
    return direction === "asc" ? comparison : -comparison;
  });
}

/**
 * Sort zones by usage (if usage data is available)
 */
export function sortZonesByUsage(zones: Zone[], direction: "asc" | "desc" = "desc"): Zone[] {
  return [...zones].sort((a, b) => {
    // For now, just sort by name since we don't have usage data
    // TODO: Implement usage tracking and sorting
    const comparison = a.name.localeCompare(b.name);
    return direction === "asc" ? comparison : -comparison;
  });
}

// ============================================================================
// ZONE COLOR UTILITIES
// ============================================================================

/**
 * Selects a color for a zone from the default palette.
 *
 * @returns A hex color string chosen from `DEFAULT_ZONE_COLORS`; returns `"#6366F1"` if selection fails.
 */
export function generateRandomZoneColor(): string {
  const colors = DEFAULT_ZONE_COLORS;
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  if (!randomColor) {
    return "#6366F1"; // Fallback to default indigo
  }
  return randomColor;
}

/**
 * Get contrasting text color for a background color
 */
export function getContrastingTextColor(backgroundColor: string): string {
  // Remove # if present
  const hex = backgroundColor.replace("#", "");

  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black or white based on luminance
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(color: string, percent: number): string {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(color: string, percent: number): string {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const newR = Math.max(0, Math.floor(r * (1 - percent / 100)));
  const newG = Math.max(0, Math.floor(g * (1 - percent / 100)));
  const newB = Math.max(0, Math.floor(b * (1 - percent / 100)));

  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

// ============================================================================
// ZONE VALIDATION
// ============================================================================

/**
 * Validate zone data
 */
export function validateZoneData(data: { name: string; color?: string; iconName?: string }): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isValidZoneName(data.name)) {
    errors.push("Zone name must be between 1 and 100 characters");
  }

  if (data.color && !isValidHexColor(data.color)) {
    errors.push("Color must be a valid hex color (e.g., #6366F1)");
  }

  if (data.iconName && !isValidIconName(data.iconName)) {
    errors.push("Icon must be a valid icon name");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize zone data
 */
export function sanitizeZoneData(data: { name: string; color?: string; iconName?: string }): {
  name: string;
  color: string;
  iconName: string;
} {
  return {
    name: data.name.trim(),
    color: data.color && isValidHexColor(data.color) ? data.color : "#6366F1",
    iconName: data.iconName && isValidIconName(data.iconName) ? data.iconName : "circle",
  };
}

// ============================================================================
// ZONE STATISTICS
// ============================================================================

/**
 * Compute task-based usage statistics for each zone.
 *
 * @param zones - The list of zones to compute statistics for.
 * @param tasks - Array of tasks where `zoneUuid` associates a task with a zone's `uuidId`; `zoneUuid` may be `null`.
 * @returns An array with one entry per zone containing:
 *  - `zone`: the zone object
 *  - `taskCount`: total tasks assigned to the zone
 *  - `completedTaskCount`: tasks with `status` equal to `"done"`
 *  - `progressPercentage`: percentage (0–100) of tasks completed in the zone
 */
export function getZoneUsageStats(
  zones: Zone[],
  tasks: Array<{ zoneUuid: string | null; status: string }>,
): Array<{
  zone: Zone;
  taskCount: number;
  completedTaskCount: number;
  progressPercentage: number;
}> {
  return zones.map((zone) => {
    const zoneTasks = tasks.filter((task) => task.zoneUuid === zone.uuidId);
    const completedTasks = zoneTasks.filter((task) => task.status === "done");

    return {
      zone,
      taskCount: zoneTasks.length,
      completedTaskCount: completedTasks.length,
      progressPercentage:
        zoneTasks.length > 0 ? (completedTasks.length / zoneTasks.length) * 100 : 0,
    };
  });
}

/**
 * Get the top zones ranked by number of tasks assigned.
 *
 * @param zones - Array of zone objects to evaluate
 * @param tasks - Array of task objects where each task has `zoneUuid` (matching a zone's `uuidId`) and `status`
 * @param limit - Maximum number of zones to return (defaults to 5)
 * @returns An array of zones sorted by descending task count, limited to `limit` entries
 */
export function getMostUsedZones(
  zones: Zone[],
  tasks: Array<{ zoneUuid: string | null; status: string }>,
  limit: number = 5,
): Zone[] {
  const stats = getZoneUsageStats(zones, tasks);
  return stats
    .sort((a, b) => b.taskCount - a.taskCount)
    .slice(0, limit)
    .map((stat) => stat.zone);
}

/**
 * Selects the zones with the fewest assigned tasks.
 *
 * @param zones - The list of zones to evaluate
 * @param tasks - Tasks used to compute usage; tasks are matched to zones by `task.zoneUuid === zone.uuidId`
 * @param limit - Maximum number of zones to return
 * @returns An array of zones with the smallest task counts, ordered from least- to more-used, up to `limit` items
 */
export function getLeastUsedZones(
  zones: Zone[],
  tasks: Array<{ zoneUuid: string | null; status: string }>,
  limit: number = 5,
): Zone[] {
  const stats = getZoneUsageStats(zones, tasks);
  return stats
    .sort((a, b) => a.taskCount - b.taskCount)
    .slice(0, limit)
    .map((stat) => stat.zone);
}
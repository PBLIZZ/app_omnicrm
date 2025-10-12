import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
// Direct retry logic (no abstraction)
const shouldRetry = (error: unknown, retryCount: number): boolean => {
  // Don't retry auth errors (401, 403)
  if (error instanceof Error && error.message.includes("401")) return false;
  if (error instanceof Error && error.message.includes("403")) return false;

  // Retry network errors up to 3 times
  if (
    error instanceof Error &&
    (error.message.includes("fetch") || error.message.includes("network"))
  ) {
    return retryCount < 3;
  }

  // Retry other errors up to 2 times
  return retryCount < 2;
};
import type { Zone } from "@/server/db/business-schemas";

// ============================================================================
// TYPES
// ============================================================================

interface ZonesResponse {
  items: Zone[];
  total: number;
}

// Zone with stats (what the service actually returns)
interface ZoneWithStats extends Zone {
  projectCount: number;
  taskCount: number;
  activeTaskCount: number;
}

interface ZonesWithStatsResponse {
  items: ZoneWithStats[];
  total: number;
}

interface UseZonesOptions {
  withStats?: boolean;
  autoRefetch?: boolean;
}

interface UseZonesReturn {
  zones: Zone[] | ZoneWithStats[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook to fetch wellness zones
 *
 * Zones are the life-business categories that wellness practitioners use
 * to organize their work and personal tasks:
 * - Personal Wellness
 * - Self Care
 * - Admin & Finances
 * - Business Development
 * - Social Media & Marketing
 * - Client Care
 */
export function useZones(options: UseZonesOptions = {}): UseZonesReturn {
  const { withStats = false, autoRefetch = true } = options;

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (withStats) {
    queryParams.set("withStats", "true");
  }

  const queryString = queryParams.toString();
  const apiUrl = `/api/omni-momentum/zones${queryString ? `?${queryString}` : ""}`;

  // Fetch zones
  const zonesQuery = useQuery({
    queryKey: queryKeys.zones.list(withStats),
    queryFn: async (): Promise<Zone[] | ZoneWithStats[]> => {
      if (withStats) {
        const result = await apiClient.get<ZonesWithStatsResponse>(apiUrl);
        return result.items ?? [];
      } else {
        const result = await apiClient.get<ZonesResponse>(apiUrl);
        return result.items ?? [];
      }
    },
    refetchInterval: autoRefetch ? 300000 : false, // Auto-refresh every 5 minutes (zones change rarely)
    retry: (failureCount, error) => shouldRetry(error, failureCount),
    staleTime: 300000, // Consider data fresh for 5 minutes
  });

  return {
    zones: zonesQuery.data ?? [],
    isLoading: zonesQuery.isLoading,
    error: zonesQuery.error,
    refetch: zonesQuery.refetch,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to get zones with usage statistics
 */
export function useZonesWithStats() {
  return useZones({ withStats: true });
}

/**
 * Hook to find a specific zone by name
 */
export function useZoneByName(zoneName: string) {
  const { zones, isLoading, error } = useZones();

  const zone = zones.find((z) => z.name === zoneName) ?? null;

  return {
    zone,
    isLoading,
    error,
  };
}

/**
 * Hook to find a specific zone by ID
 */
export function useZoneById(zoneId: number) {
  const { zones, isLoading, error } = useZones();

  const zone = zones.find((z) => z.id === zoneId) ?? null;

  return {
    zone,
    isLoading,
    error,
  };
}

/**
 * Hook that provides zone options for dropdowns/selects
 */
export function useZoneOptions() {
  const { zones, isLoading, error } = useZones();

  const options = zones.map((zone) => ({
    value: zone.id.toString(),
    label: zone.name,
    color: zone.color,
    icon: zone.iconName,
  }));

  return {
    options,
    isLoading,
    error,
  };
}

// ============================================================================
// ZONE UTILITIES
// ============================================================================

/**
 * Get the default wellness zones as constants
 * Useful for validation and fallbacks
 */
export const WELLNESS_ZONES = [
  "Personal Wellness",
  "Self Care",
  "Admin & Finances",
  "Business Development",
  "Social Media & Marketing",
  "Client Care",
] as const;

/**
 * Check if a zone name is a valid wellness zone
 */
export function isValidWellnessZone(zoneName: string): boolean {
  return WELLNESS_ZONES.includes(zoneName as (typeof WELLNESS_ZONES)[number]);
}

/**
 * Get zone color by name (with fallback)
 */
export function getZoneColor(zones: Zone[], zoneName: string): string {
  const zone = zones.find((z) => z.name === zoneName);
  return zone?.color ?? "#6366f1"; // Default indigo color
}

/**
 * Get zone icon by name (with fallback)
 */
export function getZoneIcon(zones: Zone[], zoneName: string): string {
  const zone = zones.find((z) => z.name === zoneName);
  return zone?.iconName ?? "circle"; // Default circle icon
}

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { shouldRetry } from "@/lib/errors/error-handling";
import type { ZoneDTO, ZoneWithStatsDTO } from "@omnicrm/contracts";

// ============================================================================
// TYPES
// ============================================================================

interface ZonesApiResponse {
  items: ZoneDTO[];
  total: number;
}

interface ZonesWithStatsApiResponse {
  items: ZoneWithStatsDTO[];
  total: number;
}

interface UseZonesOptions {
  withStats?: boolean;
  autoRefetch?: boolean;
}

interface UseZonesReturn {
  zones: ZoneDTO[] | ZoneWithStatsDTO[];
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<{ data: (ZoneDTO[] | ZoneWithStatsDTO[]) | undefined; error: unknown }>;
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
  const apiUrl = `/api/zones${queryString ? `?${queryString}` : ""}`;

  // Fetch zones
  const zonesQuery = useQuery({
    queryKey: queryKeys.zones.list(withStats),
    queryFn: async (): Promise<ZoneDTO[] | ZoneWithStatsDTO[]> => {
      if (withStats) {
        const data = await apiClient.get<ZonesWithStatsApiResponse>(apiUrl);
        return data.items ?? [];
      } else {
        const data = await apiClient.get<ZonesApiResponse>(apiUrl);
        return data.items ?? [];
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
export function getZoneColor(zones: ZoneDTO[], zoneName: string): string {
  const zone = zones.find((z) => z.name === zoneName);
  return zone?.color ?? "#6366f1"; // Default indigo color
}

/**
 * Get zone icon by name (with fallback)
 */
export function getZoneIcon(zones: ZoneDTO[], zoneName: string): string {
  const zone = zones.find((z) => z.name === zoneName);
  return zone?.iconName ?? "circle"; // Default circle icon
}

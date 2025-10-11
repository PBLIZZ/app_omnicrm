/**
 * Zones Service
 *
 * Business logic layer for zones management.
 * Handles transformation between repository data and business schema types.
 */

import { ZonesRepository } from "@repo";
import type {
  Zone,
  ZoneWithStats,
  ZonesListResponse,
  ZonesWithStatsResponse,
} from "@/server/db/business-schemas/zones";
import { ZoneSchema, ZoneWithStatsSchema } from "@/server/db/business-schemas/zones";
import { ok, err, DbResult, safeAsync, isErr } from "@/lib/utils/result";

/**
 * Service error types
 */
export type ZonesServiceError = {
  code: string;
  message: string;
  details?: unknown;
};

/**
 * Zones Service Class
 */
export class ZonesService {
  /**
   * List all zones
   */
  static async listZones(): Promise<DbResult<ZonesListResponse>> {
    const safeFetch = safeAsync(async () => {
      const zonesResult = await ZonesRepository.listZones();
      if (isErr(zonesResult)) {
        throw new Error(zonesResult.error.message);
      }
      const zones = (
        zonesResult as {
          success: true;
          data: Array<{ id: number; name: string; color: string | null; iconName: string | null }>;
        }
      ).data;

      // Transform repository types to business schema types using ZoneSchema
      const transformedZones: Zone[] = zones.map(
        (zone: { id: number; name: string; color: string | null; iconName: string | null }) =>
          ZoneSchema.parse(zone),
      );

      return {
        items: transformedZones,
        total: transformedZones.length,
      };
    });

    const result = await safeFetch();

    if (result.success) {
      return ok(result.data);
    }

    return err({
      code: "ZONES_LIST_ERROR",
      message: "Failed to fetch zones list",
      details: result.error,
    });
  }

  /**
   * Get zones with usage statistics
   */
  static async getZonesWithStats(): Promise<DbResult<ZonesWithStatsResponse>> {
    const safeFetch = safeAsync(async () => {
      const zonesWithStatsResult = await ZonesRepository.getZonesWithStats();
      if (isErr(zonesWithStatsResult)) {
        throw new Error(zonesWithStatsResult.error.message);
      }
      const zonesWithStats = (
        zonesWithStatsResult as {
          success: true;
          data: Array<{
            id: number;
            name: string;
            color: string | null;
            iconName: string | null;
            projectCount: number;
            taskCount: number;
            activeTaskCount: number;
          }>;
        }
      ).data;

      // Transform repository types to business schema types using ZoneWithStatsSchema
      const transformedZones: ZoneWithStats[] = zonesWithStats.map(
        (zone: {
          id: number;
          name: string;
          color: string | null;
          iconName: string | null;
          projectCount: number;
          taskCount: number;
          activeTaskCount: number;
        }) => {
          const zoneWithStatsData = {
            // Base zone data
            id: zone.id,
            name: zone.name,
            color: zone.color,
            iconName: zone.iconName,
            // Stats data
            stats: {
              activeProjects: zone.projectCount, // Map from repository
              completedProjects: 0, // TODO: Add when project status tracking is available
              activeTasks: zone.activeTaskCount,
              completedTasks: zone.taskCount - zone.activeTaskCount,
              totalItems: zone.projectCount + zone.taskCount,
              lastActivity: null as Date | null, // TODO: Add when we track last activity
            },
          };

          return ZoneWithStatsSchema.parse(zoneWithStatsData);
        },
      );

      return {
        items: transformedZones,
        total: transformedZones.length,
      };
    });

    const result = await safeFetch();

    if (result.success) {
      return ok(result.data);
    }

    return err({
      code: "ZONES_STATS_ERROR",
      message: "Failed to fetch zones with statistics",
      details: result.error,
    });
  }

  /**
   * Get a single zone by ID
   */
  static async getZoneById(zoneId: number): Promise<DbResult<Zone | null>> {
    try {
      const result = await ZonesRepository.getZoneById(zoneId);

      if (!result) {
        return ok(null);
      }

      // Transform repository type to business schema type using ZoneSchema
      const transformedZone: Zone = ZoneSchema.parse(result);
      return ok(transformedZone);
    } catch (error) {
      return err({
        code: "ZONE_GET_BY_ID_ERROR",
        message: "Error getting zone by ID",
        details: error,
      });
    }
  }

  /**
   * Get a single zone by name
   */
  static async getZoneByName(name: string): Promise<DbResult<Zone | null>> {
    try {
      const result = await ZonesRepository.getZoneByName(name);

      if (!result) {
        return ok(null);
      }

      // Transform repository type to business schema type using ZoneSchema
      const transformedZone: Zone = ZoneSchema.parse(result);
      return ok(transformedZone);
    } catch (error) {
      return err({
        code: "ZONE_GET_BY_NAME_ERROR",
        message: "Error getting zone by name",
        details: error,
      });
    }
  }
}

import { handleGetWithQueryAuth } from "@/lib/api";
import { ZonesRepository } from "@repo";
import {
  ZonesQuerySchema,
  ZonesListResponseSchema,
  ZonesWithStatsResponseSchema,
} from "@/server/db/business-schemas";

/**
 * Zones API - List zones and get zones with statistics
 *
 * These are shared wellness zone categories that all users can access.
 * Zone creation/modification is an admin function not exposed here.
 */

export const GET = handleGetWithQueryAuth(
  ZonesQuerySchema,
  ZonesListResponseSchema.or(ZonesWithStatsResponseSchema),
  async (query, _userId) => {
    const { withStats } = query;

    if (withStats) {
      const zones = await ZonesRepository.getZonesWithStats();
      return {
        items: zones,
        total: zones.length,
      };
    } else {
      const zones = await ZonesRepository.listZones();
      return {
        items: zones,
        total: zones.length,
      };
    }
  }
);

// Zone creation is an admin function - would be in /api/admin/zones/route.ts
// Not implementing POST here as zones are predefined for wellness practitioners
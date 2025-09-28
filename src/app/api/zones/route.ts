import { handleGetWithQueryAuth } from "@/lib/api";
import { ZonesService } from "@/server/services/zones.service";
import {
  ZonesQuerySchema,
  ZonesListResponseSchema,
  ZonesWithStatsResponseSchema,
} from "@/server/db/business-schemas";
import { isOk } from "@/lib/utils/result";

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
      const result = await ZonesService.getZonesWithStats();

      if (!isOk(result)) {
        throw new Error(result.error.message);
      }

      return result.data;
    } else {
      const result = await ZonesService.listZones();

      if (!isOk(result)) {
        throw new Error(result.error.message);
      }

      return result.data;
    }
  }
);

// Zone creation is an admin function - would be in /api/admin/zones/route.ts
// Not implementing POST here as zones are predefined for wellness practitioners
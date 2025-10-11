import { handleGetWithQueryAuth } from "@/lib/api";
import { ZonesService } from "@/server/services/zones.service";
import {
  ZonesQuerySchema,
  ZonesListResponseSchema,
  ZonesWithStatsResponseSchema,
} from "@/server/db/business-schemas";
import { isErr } from "@/lib/utils/result";
import type { z } from "zod";

/**
 * Zones API - List zones and get zones with statistics
 *
 * These are shared wellness zone categories that all users can access.
 * Zone creation/modification is an admin function not exposed here.
 */

export const GET = handleGetWithQueryAuth(
  ZonesQuerySchema,
  ZonesListResponseSchema.or(ZonesWithStatsResponseSchema),
  async (
    query,
    _userId,
  ): Promise<
    z.infer<typeof ZonesListResponseSchema> | z.infer<typeof ZonesWithStatsResponseSchema>
  > => {
    const { withStats } = query;

    if (withStats) {
      const result = await ZonesService.getZonesWithStats();

      if (isErr(result)) {
        throw new Error(result.error.message);
      }

      return result.data;
    } else {
      const result = await ZonesService.listZones();

      if (isErr(result)) {
        throw new Error(result.error.message);
      }

      return result.data;
    }
  },
);

// Zone creation is an admin function - would be in /api/admin/zones/route.ts
// Not implementing POST here as zones are predefined for wellness practitioners
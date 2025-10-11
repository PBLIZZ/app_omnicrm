import { handleGetWithQueryAuth } from "@/lib/api";
import { listZonesService, getZonesWithStatsService } from "@/server/services/zones.service";
import {
  ZonesQuerySchema,
  ZonesListResponseSchema,
  ZonesWithStatsResponseSchema,
} from "@/server/db/business-schemas";
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
      const items = await getZonesWithStatsService();
      return { items, total: items.length };
    } else {
      const items = await listZonesService();
      return { items, total: items.length };
    }
  },
);

// Zone creation is an admin function - would be in /api/admin/zones/route.ts
// Not implementing POST here as zones are predefined for wellness practitioners

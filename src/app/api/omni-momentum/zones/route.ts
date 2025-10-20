import { handleGetWithQueryAuth } from "@/lib/api";
import { listZonesService, getZonesWithStatsService } from "@/server/services/zones.service";
import { z } from "zod";

// Schema for query parameters
const ZonesQuerySchema = z.object({
  withStats: z.string().optional(),
});

// Schema for zones response
const ZonesResponseSchema = z.object({
  zones: z.array(z.any()),
});

/**
 * GET /api/omni-momentum/zones - Get wellness zones for user
 */
export const GET = handleGetWithQueryAuth(
  ZonesQuerySchema,
  ZonesResponseSchema,
  async (query, _userId): Promise<{ zones: unknown[] }> => {
    const { withStats } = query;

    if (withStats === "true") {
      // Return zones with statistics
      const zonesWithStats = await getZonesWithStatsService();
      return { zones: zonesWithStats };
    }

    // Get basic zones
    const zones = await listZonesService();
    return { zones };
  },
);

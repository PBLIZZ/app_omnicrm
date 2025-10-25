import { handleGetWithQueryAuth } from "@/lib/api";
import { listZonesService, getZonesWithStatsService } from "@/server/services/zones.service";
import { z } from "zod";

// Schema for query parameters
const ZonesQuerySchema = z.object({
  withStats: z.string().optional(),
});

// Schema for zones response
const ZonesResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    items: z.array(z.any()),
    total: z.number(),
  }),
});

/**
 * GET /api/omni-momentum/zones - Get wellness zones for user
 */
export const GET = handleGetWithQueryAuth(
  ZonesQuerySchema,
  ZonesResponseSchema,
  async (
    query,
    _userId,
  ): Promise<{ success: boolean; data: { items: unknown[]; total: number } }> => {
    const { withStats } = query;

    if (withStats === "true") {
      // Return zones with statistics
      const zonesWithStats = await getZonesWithStatsService();
      return {
        success: true,
        data: {
          items: zonesWithStats,
          total: zonesWithStats.length,
        },
      };
    }

    // Get basic zones
    const zones = await listZonesService();
    return {
      success: true,
      data: {
        items: zones,
        total: zones.length,
      },
    };
  },
);

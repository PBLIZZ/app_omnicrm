import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { ZonesRepository } from "@omnicrm/repo";
import { z } from "zod";

/**
 * Zones API - List zones and get zones with statistics
 *
 * These are shared wellness zone categories that all users can access.
 * Zone creation/modification is an admin function not exposed here.
 */

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "zones_list" },
  validation: {
    query: z.object({
      withStats: z.string().optional().transform(val => val === "true"),
    }).optional(),
  },
})(async ({ userId, validated }) => {
  try {
    const withStats = validated?.query?.withStats ?? false;

    if (withStats) {
      const zones = await ZonesRepository.getZonesWithStats();
      return NextResponse.json({
        items: zones,
        total: zones.length,
      });
    } else {
      const zones = await ZonesRepository.listZones();
      return NextResponse.json({
        items: zones,
        total: zones.length,
      });
    }
  } catch (error) {
    console.error("Failed to fetch zones:", error);
    return NextResponse.json(
      { error: "Failed to fetch zones" },
      { status: 500 }
    );
  }
});

// Zone creation is an admin function - would be in /api/admin/zones/route.ts
// Not implementing POST here as zones are predefined for wellness practitioners
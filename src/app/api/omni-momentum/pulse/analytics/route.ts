/**
 * Pulse Analytics API Route
 * GET /api/omni-momentum/pulse/analytics - Get pulse analytics
 */

import { handleGetWithQueryAuth } from "@/lib/api";
import { getPulseAnalyticsService } from "@/server/services/pulse.service";
import {
  PulseAnalyticsQuerySchema,
  PulseAnalyticsResponseSchema,
} from "@/server/db/business-schemas/productivity";

export const GET = handleGetWithQueryAuth(
  PulseAnalyticsQuerySchema,
  PulseAnalyticsResponseSchema,
  async (query, userId) => {
    const analytics = await getPulseAnalyticsService(
      userId,
      query.period,
    );
    return { analytics };
  },
);

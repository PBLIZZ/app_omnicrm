/**
 * GET /api/omni-connect/dashboard — unified dashboard endpoint (auth required)
 *
 * Consolidates data from:
 * - /api/google/gmail/status (CONSOLIDATED)
 * - /api/google/calendar/status (CONSOLIDATED)
 * - /api/jobs/status
 */
import { handleGetWithQueryAuth } from "@/lib/api";
import { OmniConnectDashboardService } from "@/server/services/omni-connect-dashboard.service";
import {
  DashboardQuerySchema,
  DashboardResponseSchema,
  type DashboardResponse
} from "@/server/db/business-schemas";

export const GET = handleGetWithQueryAuth(
  DashboardQuerySchema,
  DashboardResponseSchema,
  async (query, userId): Promise<DashboardResponse> => {
    const dashboardState = await OmniConnectDashboardService.getDashboardState(userId);
    return {
      ...dashboardState,
      timestamp: new Date().toISOString(),
    };
  },
);

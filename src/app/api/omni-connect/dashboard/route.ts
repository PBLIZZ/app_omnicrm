/**
 * GET /api/omni-connect/dashboard
 *
 * Unified dashboard endpoint that consolidates:
 * - Gmail/Calendar connection status
 * - Email previews
 * - Active background jobs
 * - Sync status and statistics
 */

import { handleAuth } from "@/lib/api";
import { getDashboardStateService } from "@/server/services/omni-connect-dashboard.service";
import { ConnectDashboardStateSchema } from "@/server/db/business-schemas";
import { z } from "zod";

export const GET = handleAuth(
  z.void(), // No input required for GET
  ConnectDashboardStateSchema, // Output schema
  async (voidInput, userId: string) => {
    const dashboardState = await getDashboardStateService(userId);
    return dashboardState;
  },
);

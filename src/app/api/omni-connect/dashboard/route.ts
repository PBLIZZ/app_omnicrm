/**
 * GET /api/omni-connect/dashboard
 * 
 * Unified dashboard endpoint that consolidates:
 * - Gmail/Calendar connection status
 * - Email previews
 * - Active background jobs
 * - Sync status and statistics
 */

import { getAuthUserId } from "@/lib/auth-simple";
import { getDashboardStateService } from "@/server/services/omni-connect-dashboard.service";
import { ConnectDashboardStateSchema } from "@/server/db/business-schemas";

export async function GET(): Promise<Response> {
  try {
    const userId = await getAuthUserId();
    
    const dashboardState = await getDashboardStateService(userId);
    
    // Validate the response against the schema
    const validated = ConnectDashboardStateSchema.parse(dashboardState);
    
    return Response.json(validated);
  } catch (error) {
    console.error("[OmniConnect Dashboard] Error:", error);
    
    // Return a structured error response
    return Response.json(
      {
        error: "Failed to fetch dashboard data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

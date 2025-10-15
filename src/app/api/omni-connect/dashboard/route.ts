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

/**
 * Handle GET requests for the Omni Connect dashboard for the authenticated user and return the consolidated dashboard state.
 *
 * @returns A `Response` whose JSON body is the validated dashboard state on success, or an error object `{ error: "Failed to fetch dashboard data", message: string }` with HTTP status `500` on failure.
 */
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

/**
 * GET /api/omni-connect/dashboard
 *
 * Unified dashboard endpoint that consolidates:
 * - Gmail/Calendar connection status
 * - Email previews
 * - Active background jobs
 * - Sync status and statistics
 */

import { getDashboardStateService } from "@/server/services/omni-connect-dashboard.service";
import { ConnectDashboardStateSchema } from "@/server/db/business-schemas";
import { getAuthUserId } from "@/lib/auth-simple";
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
    // Log error with structured logging
    const { logError } = await import("@/server/lib/structured-logger");
    logError(
      "OmniConnect Dashboard error",
      {
        operation: "omni_connect_dashboard",
        endpoint: "/api/omni-connect/dashboard",
      },
      error,
    );

    // Return a sanitized error response
    return Response.json(
      {
        error: "Failed to fetch dashboard data",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/google/status
 * Returns connection status for Gmail and Calendar
 * Automatically refreshes expired tokens when status is checked
 */
import { getAuthUserId } from "@/lib/auth-simple";
import { GoogleIntegrationService } from "@/server/services/google-integration.service";

export async function GET(): Promise<Response> {
  try {
    const userId = await getAuthUserId();

    const services = await GoogleIntegrationService.getStatus(userId, {
      autoRefresh: true,
    });

    return Response.json({ services });
  } catch (error) {
    console.error("[Google Status] Error:", error);
    return Response.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}

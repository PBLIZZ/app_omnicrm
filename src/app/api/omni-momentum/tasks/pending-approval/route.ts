import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { momentumService } from "@/server/services/momentum.service";

/**
 * Pending Approval Tasks API Route
 *
 * GET /api/omni-momentum/tasks/pending-approval
 * Returns tasks that are AI-generated and awaiting user approval
 * This supports the AI workflow where the system suggests tasks
 * but users must approve them before they become active
 */

/**
 * GET /api/omni-momentum/tasks/pending-approval - Get AI-generated tasks awaiting approval
 */
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "pending_approval_tasks" },
})(async ({ userId }) => {
  try {
    const pendingTasks = await momentumService.getPendingApprovalTasks(userId);
    return NextResponse.json(pendingTasks);
  } catch {
    return NextResponse.json(
      { error: "Failed to retrieve pending approval tasks" },
      { status: 500 },
    );
  }
});

import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { MomentumStorage } from "@/server/storage/momentum.storage";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";

const momentumStorage = new MomentumStorage();

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "tasks_pending_approval" },
})(async ({ userId, requestId }) => {
  const apiResponse = new ApiResponseBuilder("tasks.pending_approval", requestId);

  try {
    const tasks = await momentumStorage.getPendingApprovalMomentums(userId);
    return apiResponse.success({ tasks });
  } catch (error) {
    await logger.error(
      "Failed to fetch pending approval tasks",
      {
        operation: "api.tasks.pending_approval",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      ensureError(error),
    );
    return apiResponse.error("internal_server_error", "INTERNAL_ERROR");
  }
});

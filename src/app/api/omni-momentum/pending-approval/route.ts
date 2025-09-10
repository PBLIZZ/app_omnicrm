import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { momentumStorage } from "@/server/storage/momentum.storage";
import { ensureError } from "@/lib/utils/error-handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "momentum_pending_approval_list" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("momentum_pending_approval_list", requestId);

  try {
    const momentums = await momentumStorage.getPendingApprovalMomentums(userId);
    return api.success({ momentums });
  } catch (error) {
    return api.error(
      "Failed to fetch pending approval momentums",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

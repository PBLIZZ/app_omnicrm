import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { momentumStorage } from "@/server/storage/momentum.storage";
import { z } from "zod";
import { ensureError } from "@/lib/utils/error-handler";

const RejectMomentumSchema = z.object({
  notes: z.string().optional(),
});

const ParamsSchema = z.object({
  momentumId: z.string().uuid(),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "momentum_reject" },
  validation: {
    body: RejectMomentumSchema,
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("momentum_reject", requestId);

  try {
    await momentumStorage.rejectMomentum(validated.params.momentumId, userId, validated.body.notes);
    const momentum = await momentumStorage.getMomentum(validated.params.momentumId, userId);
    return api.success({ momentum, message: "Momentum rejected successfully" });
  } catch (error) {
    return api.error("Failed to reject momentum", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

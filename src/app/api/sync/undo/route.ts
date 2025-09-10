import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { and, eq } from "drizzle-orm";
import { jobs, rawEvents, interactions } from "@/server/db/schema";
import { z } from "zod";
import { ensureError } from "@/lib/utils/error-handler";

const undoBodySchema = z.object({
  batchId: z.string().uuid(),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "sync_undo" },
  validation: {
    body: undoBodySchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("sync.undo", requestId);

  const dbo = await getDb();

  try {
    const { batchId } = validated.body;

    // delete raw_events and interactions for this batch
    const deletedEvents = await dbo
      .delete(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.batchId, batchId)));
    const deletedInteractions = await dbo
      .delete(interactions)
      .where(and(eq(interactions.userId, userId), eq(interactions.batchId, batchId)));
    // mark jobs reverted (optional: set status)
    const deletedJobs = await dbo
      .update(jobs)
      .set({ status: "done", updatedAt: new Date() })
      .where(and(eq(jobs.userId, userId), eq(jobs.batchId, batchId)));

    return api.success({
      message: "Sync batch undone successfully",
      batchId,
      deletedJobs: deletedJobs.length,
      deletedEvents: deletedEvents.length,
      deletedInteractions: deletedInteractions.length,
    });
  } catch (error) {
    return api.error(
      `Failed to undo sync batch: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

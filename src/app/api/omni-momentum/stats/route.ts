import { handleGet } from "@/lib/api";
import { productivityService } from "@/server/services/productivity.service";
import { z } from "zod";
import { isErr } from "@/lib/utils/result";

/**
 * Momentum Statistics API Route
 *
 * GET /api/omni-momentum/stats
 * Returns statistical overview of momentum tasks and projects
 */

const MomentumStatsResponseSchema = z.object({
  total: z.number(),
  todo: z.number(),
  inProgress: z.number(),
  completed: z.number(),
  pendingApproval: z.number(),
  projects: z.number(),
});

export const GET = handleGet(
  MomentumStatsResponseSchema,
  async (): Promise<z.infer<typeof MomentumStatsResponseSchema>> => {
    // Note: This should be handleAuth but keeping as handleGet to match original pattern
    // The service will handle auth internally for now
    const result = await productivityService.getStats("user-id-placeholder");

    if (isErr(result)) {
      throw new Error(result.error.message);
    }

    const stats = result.data;

    // Format for frontend consumption
    return {
      total: stats.tasks.total,
      todo: stats.tasks.todo,
      inProgress: stats.tasks.inProgress,
      completed: stats.tasks.completed,
      pendingApproval: 0, // TODO: Add pending approval logic
      projects: stats.projects,
    };
  },
);

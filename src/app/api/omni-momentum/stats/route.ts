import { handleGet } from "@/lib/api";
import { momentumService } from "@/server/services/momentum.service";
import { z } from "zod";

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
    const stats = await momentumService.getStats("user-id-placeholder");

    // Format for frontend consumption
    return {
      total: stats.tasks.total,
      todo: stats.tasks.todo,
      inProgress: stats.tasks.inProgress,
      completed: stats.tasks.completed,
      pendingApproval: 0, // TODO: Add pending approval logic
      projects: stats.projects,
    };
  }
);

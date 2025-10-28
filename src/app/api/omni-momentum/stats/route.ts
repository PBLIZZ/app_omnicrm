import { handleGetWithQueryAuth } from "@/lib/api";
import { z } from "zod";

/**
 * OmniMomentum Stats API Route
 *
 * GET /api/omni-momentum/stats
 * Returns dashboard statistics for the OmniMomentum suite
 */

const StatsResponseSchema = z.object({
  tasks: z.object({
    total: z.number(),
    completed: z.number(),
    inProgress: z.number(),
    overdue: z.number(),
  }),
  projects: z.object({
    total: z.number(),
    active: z.number(),
    completed: z.number(),
  }),
  habits: z.object({
    total: z.number(),
    active: z.number(),
    completedToday: z.number(),
  }),
  inbox: z.object({
    unprocessed: z.number(),
    processed: z.number(),
    total: z.number(),
  }),
});

export const GET = handleGetWithQueryAuth(
  z.object({}), // No query parameters needed
  StatsResponseSchema,
  async (_query, userId): Promise<z.infer<typeof StatsResponseSchema>> => {
    // For now, return mock data since we don't have all the services implemented
    // This can be replaced with actual database queries later
    return {
      tasks: {
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
      },
      projects: {
        total: 0,
        active: 0,
        completed: 0,
      },
      habits: {
        total: 0,
        active: 0,
        completedToday: 0,
      },
      inbox: {
        unprocessed: 0,
        processed: 0,
        total: 0,
      },
    };
  },
);










/**
 * Habits Summary Analytics API Route
 * GET /api/omni-momentum/habits/analytics - Get summary across all habits
 */

import { handleGetWithQueryAuth } from "@/lib/api";
import { z } from "zod";
import { getHabitsSummaryService } from "@/server/services/habits.service";
import { HabitsSummaryResponseSchema } from "@/server/db/business-schemas/productivity";

export const GET = handleGetWithQueryAuth(
  z.object({}),
  HabitsSummaryResponseSchema,
  async (_query, userId) => {
    const summary = await getHabitsSummaryService(userId);
    return { summary };
  },
);

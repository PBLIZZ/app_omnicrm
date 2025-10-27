/**
 * Habits API Route
 * GET /api/omni-momentum/habits - List habits
 * POST /api/omni-momentum/habits - Create habit
 */

import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import { z } from "zod";
import {
  createHabitService,
  getHabitsService,
} from "@/server/services/habits.service";
import {
  CreateHabitSchema,
  HabitSchema,
  HabitsListResponseSchema,
} from "@/server/db/business-schemas/productivity";

const GetHabitsQuerySchema = z.object({
  isActive: z.string().optional().transform(val => val === "true"),
});

export const GET = handleGetWithQueryAuth(
  GetHabitsQuerySchema,
  HabitsListResponseSchema,
  async (query, userId) => {
    const habits = await getHabitsService(userId, {
      isActive: query.isActive,
    });
    return {
      items: habits,
      total: habits.length,
    };
  },
);

export const POST = handleAuth(
  CreateHabitSchema,
  HabitSchema,
  async (data, userId) => {
    return await createHabitService(userId, data);
  },
);

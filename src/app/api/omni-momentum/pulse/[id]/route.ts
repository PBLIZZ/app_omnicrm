/**
 * Pulse Log Detail API Route
 * GET /api/omni-momentum/pulse/[id] - Get single pulse log (by ID)
 * PUT /api/omni-momentum/pulse/[id] - Update pulse log
 * DELETE /api/omni-momentum/pulse/[id] - Delete pulse log
 */

import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import { z } from "zod";
import {
  updatePulseLogService,
  deletePulseLogService,
} from "@/server/services/pulse.service";
import {
  DailyPulseLogSchema,
  UpdateDailyPulseLogSchema,
} from "@/server/db/business-schemas/productivity";
import { getDb } from "@/server/db/client";
import { createProductivityRepository } from "@repo";
import type { DailyPulseLog } from "@repo";
import { AppError } from "@/lib/errors/app-error";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return handleGetWithQueryAuth(
    z.object({}),
    DailyPulseLogSchema,
    async (_query, userId) => {
      // Get log by ID (not date)
      const db = await getDb();
      const repo = createProductivityRepository(db);
      const logs = await repo.getDailyPulseLogs(userId, 1000); // Get all logs
      const log = logs.find((l: DailyPulseLog) => l.id === id);

      if (!log) {
        throw new AppError(
          "Pulse log not found",
          "NOT_FOUND",
          "validation",
          false,
          404,
        );
      }

      return log;
    },
  )(request);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return handleAuth(
    UpdateDailyPulseLogSchema,
    z.object({ success: z.literal(true) }),
    async (data, userId) => {
      await updatePulseLogService(userId, id, data);
      return { success: true as const };
    },
  )(request);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return handleAuth(
    z.object({}),
    z.object({ success: z.literal(true) }),
    async (_data, userId) => {
      await deletePulseLogService(userId, id);
      return { success: true as const };
    },
  )(request);
}

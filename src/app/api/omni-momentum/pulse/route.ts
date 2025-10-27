/**
 * Pulse Logs API Route
 * GET /api/omni-momentum/pulse - List pulse logs
 * POST /api/omni-momentum/pulse - Create pulse log
 */

import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  createPulseLogService,
  getPulseLogsService,
} from "@/server/services/pulse.service";
import {
  CreateDailyPulseLogSchema,
  DailyPulseLogSchema,
  PulseLogsQuerySchema,
  PulseLogsListResponseSchema,
} from "@/server/db/business-schemas/productivity";

export const GET = handleGetWithQueryAuth(
  PulseLogsQuerySchema,
  PulseLogsListResponseSchema,
  async (query, userId) => {
    const logs = await getPulseLogsService(userId, query.limit);
    return {
      items: logs,
      total: logs.length,
    };
  },
);

export const POST = handleAuth(
  CreateDailyPulseLogSchema,
  DailyPulseLogSchema,
  async (data, userId) => {
    return await createPulseLogService(userId, data);
  },
);

import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { momentumService } from "@/server/services/momentum.service";
import { CreateTaskSchema, TaskFiltersSchema, TaskSchema } from "@/server/db/business-schemas";
import { z } from "zod";

/**
 * API Routes for Momentum Tasks (Hierarchical Task Management)
 *
 * Following Technical Debt Elimination guidelines:
 * ✅ NextResponse pattern (Phase 17 - no ApiResponse helper)
 * ✅ Repository pattern with proper error handling
 * ✅ DTO validation with Zod schemas
 * ✅ Explicit return types for TypeScript compliance
 */

/**
 * GET /api/omni-momentum/tasks - List tasks for user with filtering
 */
export const GET = handleGetWithQueryAuth(
  TaskFiltersSchema,
  z.array(TaskSchema),
  async (filters, userId) => {
    return await momentumService.getTasks(userId, filters);
  }
);

/**
 * POST /api/omni-momentum/tasks - Create new task
 */
export const POST = handleAuth(
  CreateTaskSchema,
  TaskSchema,
  async (data, userId) => {
    return await momentumService.createTask(userId, data);
  }
);

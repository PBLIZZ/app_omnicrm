import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { listProjectsService, createProjectService } from "@/server/services/productivity.service";
import {
  CreateProjectSchema,
  ProjectFiltersSchema,
  ProjectSchema,
} from "@/server/db/business-schemas";
import { z } from "zod";

/**
 * API Routes for Momentum Projects (Pathways)
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET with query params
 * ✅ handleAuth for POST/PUT/DELETE
 * ✅ Zod validation and type safety
 */

/**
 * GET /api/omni-momentum/projects - List projects for user
 */
export const GET = handleGetWithQueryAuth(
  ProjectFiltersSchema,
  z.array(ProjectSchema),
  async (filters, userId): Promise<z.infer<typeof ProjectSchema>[]> => {
    return await listProjectsService(userId, filters);
  },
);

/**
 * POST /api/omni-momentum/projects - Create new project
 */
export const POST = handleAuth(
  CreateProjectSchema,
  ProjectSchema,
  async (data, userId): Promise<z.infer<typeof ProjectSchema>> => {
    return await createProjectService(userId, data);
  },
);

import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { momentumService } from "@/server/services/momentum.service";
import { CreateProjectSchema, ProjectFiltersSchema, ProjectSchema } from "@/server/db/business-schemas";
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
  async (filters, userId) => {
    return await momentumService.getProjects(userId, filters);
  }
);

/**
 * POST /api/omni-momentum/projects - Create new project
 */
export const POST = handleAuth(
  CreateProjectSchema,
  ProjectSchema,
  async (data, userId) => {
    return await momentumService.createProject(userId, data);
  }
);

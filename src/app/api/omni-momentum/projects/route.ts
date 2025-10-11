import { handleGetWithQueryAuth, handleAuth } from "@/lib/api";
import { productivityService } from "@/server/services/productivity.service";
import {
  CreateProjectSchema,
  ProjectFiltersSchema,
  ProjectSchema,
} from "@/server/db/business-schemas";
import { z } from "zod";
import { isErr } from "@/lib/utils/result";

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
    const result = await productivityService.getProjects(userId, filters);
    if (isErr(result)) {
      throw new Error(result.error.message);
    }
    return result.data;
  },
);

/**
 * POST /api/omni-momentum/projects - Create new project
 */
export const POST = handleAuth(
  CreateProjectSchema,
  ProjectSchema,
  async (data, userId): Promise<z.infer<typeof ProjectSchema>> => {
    const result = await productivityService.createProject(userId, data);
    if (isErr(result)) {
      throw new Error(result.error.message);
    }
    return result.data;
  },
);

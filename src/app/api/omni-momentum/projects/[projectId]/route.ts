import { handleAuth } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import {
  getProjectService,
  updateProjectService,
  deleteProjectService,
} from "@/server/services/productivity.service";
import {
  UpdateProjectSchema,
  ProjectSchema,
  type UpdateProjectInput,
} from "@/server/db/business-schemas";
import { z } from "zod";

/**
 * Individual Project Management API Routes
 *
 * Migrated to new auth pattern:
 * ✅ handleAuth for all operations
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

// Success response schema
const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

type ProjectResponse = z.infer<typeof ProjectSchema>;
type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

/**
 * GET /api/omni-momentum/projects/[projectId] - Get project by ID
 */
export async function GET(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  return handleAuth(
    z.void(),
    ProjectSchema,
    async (_, userId): Promise<ProjectResponse> => {
      const project = await getProjectService(params.projectId, userId);

      if (!project) {
        throw ApiError.notFound("Project not found");
      }

      return project;
    },
  )(request);
}

/**
 * PUT /api/omni-momentum/projects/[projectId] - Update project
 */
export async function PUT(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  return handleAuth(
    UpdateProjectSchema,
    ProjectSchema,
    async (data: UpdateProjectInput, userId): Promise<ProjectResponse> => {
      const project = await updateProjectService(params.projectId, userId, data);

      if (!project) {
        throw ApiError.notFound("Project not found");
      }

      return project;
    },
  )(request);
}

/**
 * DELETE /api/omni-momentum/projects/[projectId] - Delete project
 */
export async function DELETE(request: Request, context: RouteParams): Promise<Response> {
  const params = await context.params;
  return handleAuth(
    z.void(),
    SuccessResponseSchema,
    async (_, userId): Promise<SuccessResponse> => {
      await deleteProjectService(params.projectId, userId);
      return { success: true };
    },
  )(request);
}

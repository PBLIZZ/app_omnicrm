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
  // Use an empty schema for GET since we only need the URL parameter
  const handler = handleAuth(
    z.void(),
    ProjectSchema,
    async (_: void, userId): Promise<ProjectResponse> => {
      const params = await context.params;
      const project = await getProjectService(params.projectId, userId);

      if (!project) {
        throw new ApiError("Project not found", "PROJECT_NOT_FOUND", "validation", false);
      }

      return project;
    },
  );

  return handler(request);
}

/**
 * PUT /api/omni-momentum/projects/[projectId] - Update project
 */
export async function PUT(request: Request, context: RouteParams): Promise<Response> {
  const handler = handleAuth(
    UpdateProjectSchema,
    ProjectSchema,
    async (data: UpdateProjectInput, userId): Promise<ProjectResponse> => {
      const params = await context.params;
      const project = await updateProjectService(params.projectId, userId, data);

      if (!project) {
        throw new ApiError("Project not found", "PROJECT_NOT_FOUND", "validation", false);
      }

      return project;
    },
  );

  return handler(request);
}

/**
 * DELETE /api/omni-momentum/projects/[projectId] - Delete project
 */
export async function DELETE(request: Request, context: RouteParams): Promise<Response> {
  const handler = handleAuth(
    z.void(),
    SuccessResponseSchema,
    async (_, userId): Promise<SuccessResponse> => {
      const params = await context.params;
      await deleteProjectService(params.projectId, userId);
      return { success: true };
    },
  );

  return handler(request);
}

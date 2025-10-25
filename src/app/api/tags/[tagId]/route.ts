import { handleAuth, handleGetWithQueryAuth } from "@/lib/api";
import {
  updateTagService,
  deleteTagService,
} from "@/server/services/tags.service";
import {
  UpdateTagBodySchema,
  TagResponseSchema,
  type Tag,
} from "@/server/db/business-schemas/tags";
import { z } from "zod";

const DeleteTagResponseSchema = z.object({
  success: z.boolean(),
});

/**
 * PATCH /api/tags/[tagId] - Update tag
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tagId: string }> }
): Promise<Response> {
  const { tagId } = await params;

  return handleAuth(UpdateTagBodySchema, TagResponseSchema, async (data, userId): Promise<{ item: Tag }> => {
    return { item: await updateTagService(userId, tagId, data) };
  })(request);
}

/**
 * DELETE /api/tags/[tagId] - Delete tag
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tagId: string }> }
): Promise<Response> {
  const { tagId } = await params;

  return handleGetWithQueryAuth(z.object({}), DeleteTagResponseSchema, async (_, userId): Promise<{ success: boolean }> => {
    const success = await deleteTagService(userId, tagId);
    return { success };
  })(request);
}

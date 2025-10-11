// ===== src/app/api/onboarding/admin/tokens/[tokenId]/route.ts =====
import { z } from "zod";
import { getAuthUserId } from "@/lib/auth-simple";
import {
  getTokenByIdService,
  deleteTokenService,
} from "@/server/services/onboarding.service";
import {
  TokenInfoSchema,
  DeleteTokenResponseSchema,
} from "@/server/db/business-schemas/onboarding";
import { ApiError } from "@/lib/api/errors";

const ParamsSchema = z.object({
  tokenId: z.string().uuid(),
});

type RouteContext = { params: Promise<{ tokenId: string }> };

/**
 * GET /api/onboarding/admin/tokens/[tokenId]
 */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const userId = await getAuthUserId();
    const { tokenId } = ParamsSchema.parse(await context.params);

    const token = await getTokenByIdService(userId, tokenId);
    const validated = TokenInfoSchema.parse(token);

    return Response.json(validated);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * DELETE /api/onboarding/admin/tokens/[tokenId]
 */
export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const userId = await getAuthUserId();
    const { tokenId } = ParamsSchema.parse(await context.params);

    const result = await deleteTokenService(userId, tokenId);
    const validated = DeleteTokenResponseSchema.parse(result);

    return Response.json(validated);
  } catch (error) {
    return handleRouteError(error);
  }
}

function handleRouteError(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return Response.json({ error: "Validation failed", details: error.issues }, { status: 400 });
  }
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  return Response.json({ error: message }, { status: 500 });
}

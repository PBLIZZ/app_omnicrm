import { OnboardingTokenService } from "@/server/services/onboarding-token.service";
import {
  DeleteTokenRequestSchema,
  DeleteTokenResponseSchema,
  TokenIdParamsSchema,
  TokenInfoSchema,
} from "@/server/db/business-schemas";

interface RouteParams {
  params: {
    tokenId: string;
  };
}

// Custom handler that supports URL params
function handleAuthWithParams<TIn, TOut>(
  input: import("zod").ZodType<TIn>,
  output: import("zod").ZodType<TOut>,
  fn: (parsed: TIn, userId: string, params: any) => Promise<TOut>,
) {
  return async (req: Request, context: { params: any }) => {
    try {
      const { getServerUserId } = await import("@/server/auth/user");
      const userId = await getServerUserId();

      let body = {};
      const contentType = req.headers.get("content-type");
      const contentLength = req.headers.get("content-length");

      // Only parse body if there's actual JSON content
      if (
        contentType?.includes("application/json") &&
        contentLength &&
        parseInt(contentLength) > 0
      ) {
        body = await req.json();
      }

      // Parse and validate URL params
      const validatedParams = TokenIdParamsSchema.parse(context.params);

      const parsed = input.parse(body);
      const result = await fn(parsed, userId, validatedParams);
      const validated = output.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    } catch (error) {
      if (error instanceof import("zod").ZodError) {
        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.issues,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }

      if (error instanceof Error && "status" in error && error.status === 401) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { "content-type": "application/json" },
          status: 401,
        });
      }

      throw error;
    }
  };
}

export const GET = handleAuthWithParams(
  TokenIdParamsSchema,
  TokenInfoSchema,
  async (data, userId, params) => {
    const { tokenId } = params;

    // Get single token using service
    const token = await OnboardingTokenService.getTokenById(userId, tokenId);

    return token;
  },
);

export const DELETE = handleAuthWithParams(
  DeleteTokenRequestSchema,
  DeleteTokenResponseSchema,
  async (data, userId, params) => {
    const { tokenId } = params;

    // Delete token using service
    const result = await OnboardingTokenService.deleteUserToken(userId, tokenId);

    return {
      ok: result.success,
      message: result.message,
    };
  },
);

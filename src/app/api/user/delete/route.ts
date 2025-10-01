/** DELETE /api/user/delete — Permanent account deletion for GDPR compliance (auth required). */
import {
  UserDeletionRequestSchema,
  UserDeletionResponseSchema,
} from "@/server/db/business-schemas";
import { UserDeletionService } from "@/server/services/user-deletion.service";

// Custom handler that passes request to access IP headers
function handleAuthWithRequest<TIn, TOut>(
  input: import("zod").ZodType<TIn>,
  output: import("zod").ZodType<TOut>,
  fn: (parsed: TIn, userId: string, request: Request) => Promise<TOut>,
) {
  return async (req: Request) => {
    try {
      const { getServerUserId } = await import("@/server/auth/user");
      const userId = await getServerUserId();

      let body = {};
      const contentType = req.headers.get("content-type");
      const contentLength = req.headers.get("content-length");

      if (
        contentType?.includes("application/json") &&
        contentLength &&
        parseInt(contentLength) > 0
      ) {
        body = await req.json();
      }

      const parsed = input.parse(body);
      const result = await fn(parsed, userId, req);
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

      // Handle any Error with a numeric status property
      if (error instanceof Error && "status" in error && typeof error.status === "number") {
        return new Response(
          JSON.stringify({
            error: error.message,
            ...(error.details ? { details: error.details } : {}),
          }),
          {
            headers: { "content-type": "application/json" },
            status: error.status,
          },
        );
      }

      throw error;
    }
  };
}

export const DELETE = handleAuthWithRequest(
  UserDeletionRequestSchema,
  UserDeletionResponseSchema,
  async (
    data,
    userId,
    request,
  ): Promise<import("zod").infer<typeof UserDeletionResponseSchema>> => {
    const { confirmation, acknowledgeIrreversible } = data;

    // Extract IP address
    const ipAddress =
      request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";

    // Validate deletion request
    const validation = UserDeletionService.validateDeletionRequest({
      confirmation,
      acknowledgeIrreversible,
      ipAddress,
    });

    if (!validation.valid) {
      const error = new Error("Invalid deletion request");
      // Type-safe extension of Error object
      Object.defineProperty(error, "status", {
        value: 400,
        writable: false,
        enumerable: true,
        configurable: false,
      });
      Object.defineProperty(error, "details", {
        value: validation.errors,
        writable: false,
        enumerable: true,
        configurable: false,
      });
      throw error;
    }

    // Execute deletion
    const result = await UserDeletionService.deleteUserData(userId, {
      confirmation,
      acknowledgeIrreversible,
      ipAddress,
    });

    return result;
  },
);

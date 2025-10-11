/** DELETE /api/user/delete — Permanent account deletion for GDPR compliance (auth required). */
import {
  UserDeletionRequestSchema,
  UserDeletionResponseSchema,
  type UserDeletionResponse,
} from "@/server/db/business-schemas";
import { UserDeletionService } from "@/server/services/user-deletion.service";
import { getAuthUserId } from "@/lib/auth-simple";
import { ApiError } from "@/lib/api/errors";
import { z } from "zod";

/**
 * Custom handler for user deletion that needs access to request headers for IP tracking
 */
export async function DELETE(request: Request): Promise<Response> {
  try {
    // Get authenticated user
    const userId = await getAuthUserId();

    // Parse request body
    const contentType = request.headers.get("content-type");
    const contentLength = request.headers.get("content-length");

    let body: unknown = {};
    if (
      contentType?.includes("application/json") &&
      contentLength &&
      parseInt(contentLength) > 0
    ) {
      body = await request.json();
    }

    // Validate input
    const data = UserDeletionRequestSchema.parse(body);
    const { confirmation, acknowledgeIrreversible } = data;

    // Extract IP address from request headers
    const ipAddress =
      request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";

    // Validate deletion request
    const validation = UserDeletionService.validateDeletionRequest({
      confirmation,
      acknowledgeIrreversible,
      ipAddress,
    });

    if (!validation.valid) {
      throw new ApiError("Invalid deletion request", 400, validation.errors);
    }

    // Execute deletion
    const result: UserDeletionResponse = await UserDeletionService.deleteUserData(userId, {
      confirmation,
      acknowledgeIrreversible,
      ipAddress,
    });

    // Validate output
    const validated = UserDeletionResponseSchema.parse(result);

    // eslint-disable-next-line no-restricted-syntax -- Legitimate: validated JSON response
    return new Response(JSON.stringify(validated), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Handle ApiError
    if (error instanceof ApiError) {
      // eslint-disable-next-line no-restricted-syntax -- Legitimate: error response
      return new Response(
        JSON.stringify({
          error: error.message,
          details: error.details,
        }),
        {
          headers: { "content-type": "application/json" },
          status: error.status,
        },
      );
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      // eslint-disable-next-line no-restricted-syntax -- Legitimate: error response
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

    // Handle auth errors
    if (error instanceof Error && "status" in error && error.status === 401) {
      // eslint-disable-next-line no-restricted-syntax -- Legitimate: error response
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      });
    }

    // Re-throw unexpected errors
    throw error;
  }
}

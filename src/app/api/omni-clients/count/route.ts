import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GetOmniClientsQuerySchema } from "@/lib/validation/schemas/omniClients";
import { ContactsRepository } from "packages/repo/src/contacts.repo";
import { ZodError } from "zod";
import { logger } from "@/lib/observability";
import { isAuthError, isValidationError, getErrorMessage } from "@/lib/utils/auth-error-utils";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = GetOmniClientsQuerySchema.parse(queryParams);

    // Get count using repository
    const total = await ContactsRepository.countContacts(userId, validatedQuery.search);

    return NextResponse.json({ count: total });
  } catch (error) {
    // Handle validation errors
    if (isValidationError(error)) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.message },
        { status: 400 },
      );
    }

    // Handle auth errors
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.error("Failed to count omni clients", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Failed to count omni clients",
        details: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

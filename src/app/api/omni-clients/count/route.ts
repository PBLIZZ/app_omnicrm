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

    // Parse query parameters (only search for filtering)
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = GetOmniClientsQuerySchema.parse(queryParams);

    // For count, we only need search param
    const repoParams = {
      search: validatedQuery.search,
    };

    const total = await ContactsRepository.countContacts(userId, repoParams.search);

    return NextResponse.json({ count: total });
  } catch (error) {
    logger.error("Failed to count omni clients", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      search: validatedQuery?.search,
    });

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

    return NextResponse.json(
      {
        error: "Failed to count omni clients",
        details: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

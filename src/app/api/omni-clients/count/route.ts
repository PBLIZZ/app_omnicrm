import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GetOmniClientsQuerySchema } from "@/lib/validation/schemas/omniClients";
import { ContactsRepository } from "packages/repo/src/contacts.repo";
import { ZodError } from "zod";

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
    console.error("Failed to count omni clients:", error);

    // Handle validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.message },
        { status: 400 },
      );
    }

    // Handle auth errors - check both status and statusCode properties
    if (error instanceof Error) {
      const errorWithStatus = error as any;
      const status = errorWithStatus.status || errorWithStatus.statusCode;
      const isUnauthorized =
        status === 401 ||
        error.name === "Unauthorized" ||
        error.message.includes("Unauthorized") ||
        error.message.includes("401");

      if (isUnauthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    return NextResponse.json(
      {
        error: "Failed to count omni clients",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

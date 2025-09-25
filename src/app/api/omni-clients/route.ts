import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import {
  GetOmniClientsQuerySchema,
  CreateOmniClientSchema,
} from "@/lib/validation/schemas/omniClients";
import {
  toOmniClientsWithNotes,
  toOmniClient,
  fromOmniClientInput,
} from "@/server/adapters/omniClients";
import { listContactsService, createContactService } from "@/server/services/contacts.service";

/**
 * OmniClients API - List and Create
 *
 * UI boundary transformation: presents "OmniClients" while using "contacts" backend
 * Uses adapter pattern to transform Contact objects to OmniClient objects
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = GetOmniClientsQuerySchema.parse(queryParams);

    const page = validatedQuery.page ?? 1;
    const pageSize = validatedQuery.pageSize ?? validatedQuery.limit ?? 50;
    const sortKey = validatedQuery.sort ?? "displayName";
    const sortDir = validatedQuery.order === "desc" ? "desc" : "asc";

    const params: Parameters<typeof listContactsService>[1] = {
      sort: sortKey,
      order: sortDir,
      page,
      pageSize,
    };
    if (validatedQuery.search) params.search = validatedQuery.search;

    const { items, total } = await listContactsService(userId, params);

    // Transform Contact[] to OmniClientWithNotes[] using adapter
    const omniClients = toOmniClientsWithNotes(items as any);

    return NextResponse.json({
      items: omniClients,
      total,
      nextCursor: null, // Add nextCursor to match schema
    });
  } catch (error) {
    console.error("Failed to fetch omni clients:", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.message },
        { status: 400 },
      );
    }

    // Handle auth errors
    if (error instanceof Error && "status" in error && error.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Failed to fetch omni clients",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body: unknown = await request.json();

    // Validate request body
    const validatedBody = CreateOmniClientSchema.parse(body);

    // Transform OmniClient input to Contact input using adapter
    const contactInput = fromOmniClientInput(validatedBody as any);

    const row = await createContactService(userId, contactInput);

    if (!row) {
      return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
    }

    // Transform Contact back to OmniClient for response
    const omniClient = toOmniClient(row);

    return NextResponse.json({ item: omniClient }, { status: 201 });
  } catch (error) {
    console.error("Failed to create omni client:", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid client data", details: error.message },
        { status: 400 },
      );
    }

    // Handle auth errors
    if (error instanceof Error && "status" in error && error.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Failed to create omni client",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

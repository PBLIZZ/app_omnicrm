import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import {
  GetOmniClientsQuerySchema,
  CreateOmniClientSchema,
} from "@/lib/validation/schemas/omniClients";
import { OmniClientsService } from "@/server/services/omni-clients.service";

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

    // Delegate to service layer
    const result = await OmniClientsService.listOmniClients(userId, validatedQuery);

    return NextResponse.json(result);
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

    // Delegate to service layer
    const result = await OmniClientsService.createOmniClient(userId, validatedBody);

    return NextResponse.json(result, { status: 201 });
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

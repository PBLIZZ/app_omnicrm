import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
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

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_list" },
  validation: {
    query: GetOmniClientsQuerySchema,
  },
})(async ({ userId, validated, requestId }) => {
  try {
    const page = validated.query.page ?? 1;
    const pageSize = validated.query.pageSize ?? validated.query.limit ?? 50;
    const sortKey = validated.query.sort ?? "displayName";
    const sortDir = validated.query.order === "desc" ? "desc" : "asc";

    const params: Parameters<typeof listContactsService>[1] = {
      sort: sortKey,
      order: sortDir,
      page,
      pageSize,
    };
    if (validated.query.search) params.search = validated.query.search;

    const { items, total } = await listContactsService(userId, params);

    // Transform Contact[] to OmniClientWithNotes[] using adapter
    const omniClients = toOmniClientsWithNotes(items);

    return NextResponse.json({
      items: omniClients,
      total,
      nextCursor: null, // Add nextCursor to match schema
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch omni clients" },
      { status: 500 }
    );
  }
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_create" },
  validation: {
    body: CreateOmniClientSchema,
  },
})(async ({ userId, validated, requestId }) => {
  try {
    // Transform OmniClient input to Contact input using adapter
    const contactInput = fromOmniClientInput(validated.body);

    const row = await createContactService(userId, contactInput);

    if (!row) {
      return NextResponse.json(
        { error: "Failed to create client" },
        { status: 500 }
      );
    }

    // Transform Contact back to OmniClient for response
    const omniClient = toOmniClient(row);

    return NextResponse.json({ item: omniClient }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create omni client" },
      { status: 500 }
    );
  }
});

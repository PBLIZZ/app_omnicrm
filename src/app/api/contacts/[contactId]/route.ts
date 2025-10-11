import { ApiError } from "@/lib/api/errors";
import {
  getContactByIdService,
  updateContactService,
  deleteContactService,
} from "@/server/services/contacts.service";
import {
  UpdateContactBodySchema,
  DeleteContactResponseSchema,
  ContactResponseSchema,
} from "@/server/db/business-schemas";
import { getServerUserId } from "@/server/auth/user";
import { cookies } from "next/headers";

/**
 * Individual Contact Management API Routes
 *
 * Uses Next.js App Router patterns with direct param access
 */

type RouteContext = {
  params: Promise<{ contactId: string }>;
};

/**
 * GET /api/contacts/[contactId] - Get contact by ID
 */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const userId = await getServerUserId(cookieStore);
    const { contactId } = await context.params;
    
    const result = await getContactByIdService(userId, contactId);

    if (!result.success) {
      throw ApiError.notFound(result.error.message ?? "Contact not found");
    }

    const validated = ContactResponseSchema.parse({ item: result.data });
    return new Response(JSON.stringify(validated), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (error) {
    if (error instanceof ApiError) {
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
    throw error;
  }
}

/**
 * PUT /api/contacts/[contactId] - Update contact
 */
export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const userId = await getServerUserId(cookieStore);
    const { contactId } = await context.params;
    
    const body = await request.json();
    const data = UpdateContactBodySchema.parse(body);
    
    const result = await updateContactService(userId, contactId, data);

    if (!result.success) {
      throw ApiError.notFound(result.error.message ?? "Contact not found");
    }

    const validated = ContactResponseSchema.parse({ item: result.data });
    return new Response(JSON.stringify(validated), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (error) {
    if (error instanceof ApiError) {
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
    throw error;
  }
}

/**
 * DELETE /api/contacts/[contactId] - Delete contact
 */
export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const userId = await getServerUserId(cookieStore);
    const { contactId } = await context.params;

    const result = await deleteContactService(userId, contactId);

    // idempotent delete - return success even if contact didn't exist
    const validated = DeleteContactResponseSchema.parse({
      deleted: result.success && result.data ? 1 : 0,
    });
    
    return new Response(JSON.stringify(validated), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (error) {
    if (error instanceof ApiError) {
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
    throw error;
  }
}

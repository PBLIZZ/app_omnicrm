import { z } from "zod";
import { getAuthUserId } from "@/lib/auth-simple";
import {
  getContactWithNotesService,
  updateContactService,
  deleteContactService,
} from "@/server/services/contacts.service";
import {
  UpdateContactBodySchema,
  DeleteContactResponseSchema,
  ContactSchema,
} from "@/server/db/business-schemas";
import { ApiError } from "@/lib/api/errors";

/**
 * Individual Contact Management API Routes
 *
 * Pattern: Extract params → Call service (throws) → Return response
 * Error handling: Catch AppError/ApiError and format to JSON response
 */

const ParamsSchema = z.object({
  contactId: z.string().uuid(),
});

type RouteContext = { params: Promise<{ contactId: string }> };

/**
 * GET /api/contacts/[contactId] - Get contact with full notes array
 * Returns ContactWithNotes for detail views
 */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const userId = await getAuthUserId();
    const { contactId } = ParamsSchema.parse(await context.params);

    // Use getContactWithNotesService to include full notes array
    const contactWithNotes = await getContactWithNotesService(userId, contactId);
    
    // Note: ContactSchema validates base Contact fields, notes are added on top
    return Response.json(contactWithNotes);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PUT /api/contacts/[contactId] - Update contact
 */
export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  try {
    const userId = await getAuthUserId();
    const { contactId } = ParamsSchema.parse(await context.params);
    const body: unknown = await request.json();
    const data = UpdateContactBodySchema.parse(body);

    const contact = await updateContactService(userId, contactId, data);
    const validated = ContactSchema.parse(contact);

    return Response.json(validated);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * DELETE /api/contacts/[contactId] - Delete contact
 */
export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const userId = await getAuthUserId();
    const { contactId } = ParamsSchema.parse(await context.params);

    const deleted = await deleteContactService(userId, contactId);
    const response = DeleteContactResponseSchema.parse({ deleted: deleted ? 1 : 0 });

    return Response.json(response);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * Centralized error handler for this route
 */
function handleRouteError(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return Response.json({ error: "Validation failed", details: error.issues }, { status: 400 });
  }

  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  // All other errors (including AppError from services)
  const message = error instanceof Error ? error.message : "Internal server error";
  return Response.json({ error: message }, { status: 500 });
}

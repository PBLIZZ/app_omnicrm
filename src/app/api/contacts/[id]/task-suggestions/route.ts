import { NextRequest } from "next/server";
import { ContactAIActionsService } from "@/server/services/contact-ai-actions.service";
import { getServerUserId } from "@/server/auth/user";
import { ok, err } from "@/lib/api/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const userId = await getServerUserId();

    const { id: contactId } = await params;

    if (!contactId) {
      return err(400, "Contact ID is required");
    }

    const taskSuggestions = await ContactAIActionsService.generateTaskSuggestions(
      userId,
      contactId,
    );

    return ok({ suggestions: taskSuggestions });
  } catch (error) {
    console.error("Error generating task suggestions:", error);

    if (error instanceof Error && error.message === "Contact not found") {
      return err(404, "Contact not found");
    }

    return err(500, "Failed to generate task suggestions");
  }
}

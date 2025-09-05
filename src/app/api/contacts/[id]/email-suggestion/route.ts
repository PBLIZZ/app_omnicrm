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
    const body = (await request.json().catch(() => ({}))) as { purpose?: string };
    const { purpose } = body;

    if (!contactId) {
      return err(400, "Contact ID is required");
    }

    const emailSuggestion = await ContactAIActionsService.generateEmailSuggestion(
      userId,
      contactId,
      purpose,
    );

    return ok(emailSuggestion);
  } catch (error) {
    console.error("Error generating email suggestion:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return err(404, "Contact not found or has no email address");
    }

    return err(500, "Failed to generate email suggestion");
  }
}

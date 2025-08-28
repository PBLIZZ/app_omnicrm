import { NextRequest, NextResponse } from "next/server";
import { ContactSuggestionService } from "@/server/services/contact-suggestion.service";
import { getServerUserId } from "@/server/auth/user";
import { ok, err } from "@/server/lib/http";

export async function GET(request: NextRequest) {
  try {
    const userId = await getServerUserId();

    const suggestions = await ContactSuggestionService.getContactSuggestions(userId);

    return ok({
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    console.error("❌ Contact suggestions API error:", error);
    return err(500, error instanceof Error ? error.message : "Unknown error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getServerUserId();

    const { suggestionIds } = await request.json();

    if (!Array.isArray(suggestionIds)) {
      return err(400, "suggestionIds must be an array");
    }

    const result = await ContactSuggestionService.createContactsFromSuggestions(
      userId,
      suggestionIds,
    );

    return ok(result);
  } catch (error) {
    console.error("❌ Create contacts API error:", error);
    return err(500, error instanceof Error ? error.message : "Unknown error");
  }
}

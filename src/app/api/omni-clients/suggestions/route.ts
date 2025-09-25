import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { contactSuggestionService } from "@/server/services/contact-suggestion.service";

/**
 * OmniClients Suggestions API
 *
 * GET: Returns calendar-based contact suggestions
 * POST: Creates contacts from approved suggestions
 * Uses existing ContactSuggestionService with UI terminology transformation
 */

const CreateFromSuggestionsSchema = z.object({
  suggestionIds: z.array(z.string().min(1)).min(1).max(50), // Limit to 50 suggestions at once
});

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Get contact suggestions from calendar attendees
    const suggestions = await contactSuggestionService.getContactSuggestions(userId);

    // Transform ContactSuggestion[] to match OmniClients terminology
    // (The types are already aligned, so no transformation needed)
    return NextResponse.json({
      suggestions,
    });
  } catch (error) {
    console.error("GET /api/omni-clients/suggestions error:", error);
    return NextResponse.json({ error: "Failed to fetch contact suggestions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const validation = CreateFromSuggestionsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    // Create contacts from suggestions
    const result = await contactSuggestionService.createContactsFromSuggestions(
      userId,
      validation.data.suggestionIds,
    );

    if (!result.success && result.createdCount === 0) {
      console.error("Failed to create clients from suggestions:", {
        userId,
        suggestionIds: validation.data.suggestionIds,
        result,
      });
      return NextResponse.json({ error: "Failed to create clients" }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      createdCount: result.createdCount,
      message: `Successfully created ${result.createdCount} OmniClient${result.createdCount === 1 ? "" : "s"}`,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("POST /api/omni-clients/suggestions error:", error);
    return NextResponse.json(
      { error: "Failed to create contacts from suggestions" },
      { status: 500 },
    );
  }
}

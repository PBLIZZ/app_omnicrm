// ===== RAG API ROUTE (app/api/chat/route.ts) =====
import { NextRequest, NextResponse } from "next/server";
import { ChatService, type ChatRequestBody } from "@/server/services/chat.service";
import { z } from "zod";

// Schema for chat request validation
const ChatRequestBodySchema = z.object({
  message: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      }),
    )
    .optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json();
    const body = ChatRequestBodySchema.parse(rawBody);
    const result = await ChatService.processChatRequest(body);

    return NextResponse.json(result);
  } catch (error) {
    // Log full error details on server for debugging
    console.error("RAG Chat error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error.message },
        { status: 400 },
      );
    }

    // Return sanitized error message to client
    return NextResponse.json(
      {
        error: "An error occurred while processing your request. Please try again later.",
      },
      { status: 500 },
    );
  }
}

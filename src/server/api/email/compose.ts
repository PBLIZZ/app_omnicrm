import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { err, safeJson, ok } from "@/server/http/responses";
import { ClaudeChatService } from "@/server/services/claude-chat.service";
import { z } from "zod";

const ComposeEmailSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  context: z.any().optional(),
});

export async function POST(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = ComposeEmailSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  const { prompt, context } = parsed.data;

  try {
    const emailContent = await ClaudeChatService.composeEmail(userId, prompt, context);
    
    return ok({
      emailContent,
      subject: extractSubjectLine(emailContent),
      body: extractEmailBody(emailContent)
    });
  } catch (error) {
    console.error("Email composition error:", error);
    return err(500, "failed_to_compose_email");
  }
}

function extractSubjectLine(emailContent: string): string {
  // Try to extract subject line from email content
  const subjectMatch = emailContent.match(/Subject:\s*([^\n]+)/i);
  if (subjectMatch) {
    return subjectMatch[1].trim();
  }
  
  // Fallback: use first line if it looks like a subject
  const lines = emailContent.split('\n');
  const firstLine = lines[0]?.trim();
  if (firstLine && firstLine.length < 100 && !firstLine.includes('Dear') && !firstLine.includes('Hi ')) {
    return firstLine;
  }
  
  return "Special Yoga Promotion";
}

function extractEmailBody(emailContent: string): string {
  // Remove subject line if present
  let body = emailContent.replace(/Subject:\s*[^\n]+\n?/i, '');
  
  // Clean up the body
  body = body.trim();
  
  return body;
}
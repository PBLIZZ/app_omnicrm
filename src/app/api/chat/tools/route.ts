import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { err } from "@/lib/api/http";
import { DatabaseQueryService } from "@/server/services/database-query.service";

// A map of available server-side functions that the agent can call.
const availableTools: Record<string, (userId: string, args: any) => Promise<any>> = {
  get_contacts_summary: (userId) => DatabaseQueryService.getContactsSummary(userId),
  search_contacts: (userId, args) => DatabaseQueryService.searchContacts(userId, args.query),
};

/**
 * This endpoint receives a tool call from the client, executes the corresponding
 * server-side function, and returns the result.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    return err(401, "unauthorized");
  }

  const body = await req.json();
  const { toolName, toolArgs } = body;

  if (typeof toolName !== "string" || !availableTools[toolName]) {
    return err(400, `Tool "${toolName}" not found.`);
  }

  try {
    const result = await availableTools[toolName](userId, toolArgs);
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error executing tool "${toolName}":`, error);
    return err(500, `Error executing tool "${toolName}".`);
  }
}

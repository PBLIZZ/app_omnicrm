import { ok, err } from "@/lib/api/http";
import { getServerUserId } from "@/server/auth/user";
import { DatabaseQueryService } from "@/server/services/database-query.service";
import type { DatabaseQueryResult } from "@/server/services/database-query.service";

// Tool function arguments interfaces
interface SearchContactsArgs {
  query: string;
}

// A map of available server-side functions that the agent can call.
const availableTools: Record<
  string,
  (userId: string, args?: unknown) => Promise<DatabaseQueryResult>
> = {
  get_contacts_summary: (userId) => DatabaseQueryService.getContactsSummary(userId),
  search_contacts: (userId, args) => {
    if (!args || typeof args !== "object" || !("query" in args)) {
      throw new Error("Missing required query parameter");
    }
    const typedArgs = args as SearchContactsArgs;
    return DatabaseQueryService.searchContacts(userId, typedArgs.query);
  },
};

/**
 * This endpoint receives a tool call from the client, executes the corresponding
 * server-side function, and returns the result.
 */
export async function POST(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (authError: unknown) {
    console.error("Chat tools POST - auth error:", authError);
    return err(401, "unauthorized");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (parseError: unknown) {
    console.error("Chat tools POST - JSON parse error:", parseError);
    return err(400, "invalid_json");
  }

  const bodyRecord = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const { toolName, toolArgs } = bodyRecord;

  if (typeof toolName !== "string" || !availableTools[toolName]) {
    return err(400, `Tool "${toolName}" not found.`);
  }

  try {
    const result = await availableTools[toolName](userId, toolArgs);
    return ok(result);
  } catch (error) {
    console.error(`Error executing tool "${toolName}":`, error);
    return err(500, `Error executing tool "${toolName}".`);
  }
}

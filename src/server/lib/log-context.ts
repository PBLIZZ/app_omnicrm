import type { NextRequest } from "next/server";
import { getServerUserId } from "@/server/auth/user";

// Non-throwing user id resolver for logging context
async function tryGetUserId(): Promise<string | undefined> {
  try {
    return await getServerUserId();
  } catch {
    return undefined;
  }
}

export async function buildLogContext(req?: NextRequest): Promise<RequestContext> {
  const reqId = req?.headers.get("x-request-id") ?? undefined;
  const userId = await tryGetUserId();
  return { reqId, userId };
}

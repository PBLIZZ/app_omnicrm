// Test OAuth setup - creates actual test data instead of bypassing auth
// This approach maintains security while enabling e2e tests

import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { encryptString } from "@/server/utils/crypto";

export async function setupTestOAuthTokens(userId: string): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Test OAuth setup is not allowed in production");
  }

  const accessToken = process.env["E2E_GOOGLE_ACCESS_TOKEN"];
  const refreshToken = process.env["E2E_GOOGLE_REFRESH_TOKEN"];

  if (!accessToken) {
    return;
  }

  const db = await getDb();

  // Check if integration already exists
  const existing = await db
    .select()
    .from(userIntegrations)
    .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")))
    .limit(1);

  const tokenData = {
    userId,
    provider: "google" as const,
    accessToken: encryptString(accessToken),
    refreshToken: refreshToken ? encryptString(refreshToken) : null,
    expiryDate: new Date(Date.now() + 3600000), // 1 hour from now
    updatedAt: new Date(),
  };

  if (existing[0]) {
    // Update existing
    await db
      .update(userIntegrations)
      .set(tokenData)
      .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")));
  } else {
    // Insert new
    await db.insert(userIntegrations).values({
      ...tokenData,
      createdAt: new Date(),
    });
  }
}

export function hasTestOAuthTokens(): boolean {
  return process.env.NODE_ENV !== "production" && !!process.env["E2E_GOOGLE_ACCESS_TOKEN"];
}

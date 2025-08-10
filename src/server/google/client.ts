import { google } from "googleapis";
import { db } from "@/server/db/client";
import { and, eq } from "drizzle-orm";
import { userIntegrations } from "@/server/db/schema";

export type GoogleApisClients = {
  oauth2: InstanceType<typeof google.auth.OAuth2>;
  gmail: ReturnType<typeof google.gmail>;
  calendar: ReturnType<typeof google.calendar>;
};

export async function getGoogleClients(userId: string): Promise<GoogleApisClients> {
  const rows = await db
    .select()
    .from(userIntegrations)
    .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw Object.assign(new Error("google_not_connected"), { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"]!,
    process.env["GOOGLE_CLIENT_SECRET"]!,
    process.env["GOOGLE_REDIRECT_URI"]!,
  );

  oauth2Client.setCredentials({
    access_token: row.accessToken,
    refresh_token: (row.refreshToken ?? null) as string | null,
    expiry_date: row.expiryDate ? row.expiryDate.getTime() : null,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (!(tokens.access_token || tokens.refresh_token)) return;
    await db
      .update(userIntegrations)
      .set({
        accessToken: tokens.access_token ?? row.accessToken,
        refreshToken: tokens.refresh_token ?? row.refreshToken,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : row.expiryDate,
        updatedAt: new Date(),
      })
      .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")));
  });

  return {
    oauth2: oauth2Client,
    gmail: google.gmail({ version: "v1", auth: oauth2Client }),
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
  };
}

// Back-compat helper with old name
export async function getGoogleClient(
  userId: string,
): Promise<Pick<GoogleApisClients, "gmail" | "calendar">> {
  const { gmail, calendar } = await getGoogleClients(userId);
  return { gmail, calendar };
}

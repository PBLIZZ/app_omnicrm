import { handleAuth } from "@/lib/api";
import { OAuthStartQuerySchema, GmailRefreshResponseSchema } from "@/server/db/business-schemas";
import { GoogleGmailService } from "@/server/services/google-gmail.service";

export const POST = handleAuth(OAuthStartQuerySchema, GmailRefreshResponseSchema, async (_data, userId) => {
  // Attempt to refresh Gmail tokens
  await GoogleGmailService.getAuth(userId);

  return {
    success: true,
    message: "Gmail tokens refreshed successfully",
  };
});

import { z } from "zod";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";

const consentSchema = z.object({ allowProfilePictureScraping: z.boolean() }).strict();

/**
 * PUT /api/settings/consent — temporary scaffold (auth required)
 * Accepts { allowProfilePictureScraping: boolean }
 * Returns 200 OK without persistence for now.
 */
export const PUT = createRouteHandler({
  auth: true,
  rateLimit: { operation: "settings_consent" },
  validation: { body: consentSchema },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("settings.consent", requestId);

  // Log the consent update for debugging (remove in production)
  console.debug("Consent settings updated for user:", userId, "with data:", validated.body);

  // Persistence tracked in GitHub issues #61 (DB migration) and #62 (error handling)
  return api.success({});
});

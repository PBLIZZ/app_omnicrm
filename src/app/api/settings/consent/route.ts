import { z } from "zod";
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";

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

  // Log the consent update for debugging (remove in production)
  console.warn("Consent settings updated for user:", userId, "with data:", validated.body);

  // Persistence tracked in GitHub issues #61 (DB migration) and #62 (error handling)
  return NextResponse.json({});
});

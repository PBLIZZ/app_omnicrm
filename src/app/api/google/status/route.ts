/**
 * GET /api/google/status
 * Returns connection status for Gmail and Calendar
 * Automatically refreshes expired tokens when status is checked
 */
import { handleGet } from "@/lib/api";
import { getGoogleStatusService } from "@/server/services/google-status.service";
import { GoogleStatusResponseSchema } from "@/server/db/business-schemas";
import { z } from "zod";

export const GET = handleGet(
  GoogleStatusResponseSchema,
  async (): Promise<z.infer<typeof GoogleStatusResponseSchema>> => {
    return await getGoogleStatusService();
  },
);

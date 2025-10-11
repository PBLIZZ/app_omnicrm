import { handlePublicGet } from "@/lib/api-edge-cases";
import { getSystemHealthService } from "@/server/services/health.service";
import {
  HealthResponseSchema,
  type HealthResponse
} from "@/server/db/business-schemas";

export const GET = handlePublicGet(
  HealthResponseSchema,
  async (): Promise<HealthResponse> => {
    return await getSystemHealthService();
  }
);

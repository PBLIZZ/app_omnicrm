import { handlePublicGet } from "@/lib/api-edge-cases";
import { HealthService } from "@/server/services/health.service";
import { unwrap } from "@/lib/utils/result";
import {
  HealthResponseSchema,
  type HealthResponse
} from "@/server/db/business-schemas";

export const GET = handlePublicGet(
  HealthResponseSchema,
  async (): Promise<HealthResponse> => {
    const result = await HealthService.getSystemHealth();
    return unwrap(result);
  }
);
